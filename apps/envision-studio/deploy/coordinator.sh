#!/bin/sh
# Install one new private service or upgrade its verified container.
set -eu
: "${ENVISION_OWNER:?Set the authorized Tailscale login}"
: "${ENVISION_ORIGIN:?Set the private HTTPS origin including port 8443}"
: "${ENVISION_HOME:?Set the new private installation directory}"
: "${ENVISION_IMAGE:?Set the verified coordinator image tag}"
umask 077
volume=${ENVISION_VOLUME:-"$ENVISION_HOME/data"}
previous=
if [ "${1:-}" = "--upgrade" ]; then
  config_mount=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/config"}}{{.Source}}{{end}}{{end}}' envision-personal-studio)
  test "$config_mount" = "$ENVISION_HOME/config"
  test -s "$volume/studio.sqlite"
  test -s "$ENVISION_HOME/config/worker.key"
  previous=envision-rollback-$(docker inspect --format '{{.Id}}' envision-personal-studio | cut -c1-12)
  docker stop envision-personal-studio >/dev/null
  docker rename envision-personal-studio "$previous"
else
  test ! -e "$ENVISION_HOME/config/worker.key" || { echo "Existing configuration: use --upgrade."; exit 1; }
  if docker container inspect envision-personal-studio >/dev/null 2>&1; then echo "Studio container already exists."; exit 1; fi
  if ss -Hln '( sport = :8766 or sport = :8443 )' | grep -q .; then echo "Studio port is in use."; exit 1; fi
  mkdir -p "$volume" "$ENVISION_HOME/config"
  python3 -c 'import secrets;print(secrets.token_urlsafe(48))' > "$ENVISION_HOME/config/worker.key"
fi
recover() {
  if [ -n "$previous" ]; then
    if docker container inspect envision-personal-studio >/dev/null 2>&1; then
      docker stop envision-personal-studio >/dev/null
      docker rename envision-personal-studio "envision-failed-$(date +%s)"
    fi
    docker rename "$previous" envision-personal-studio
    docker start envision-personal-studio >/dev/null
  fi
}
trap recover EXIT
docker run -d --name envision-personal-studio --restart unless-stopped --network host \
  --user "$(id -u):$(id -g)" --read-only --cap-drop ALL --security-opt no-new-privileges \
  --memory 2g --cpus 2 --tmpfs /tmp:size=128m --log-opt max-size=4m --log-opt max-file=2 \
  -e ENVISION_OWNER -e ENVISION_ORIGIN -e ENVISION_WORKER_KEY_FILE=/config/worker.key \
  -v "$volume:/data" -v "$ENVISION_HOME/config:/config:ro" "$ENVISION_IMAGE"
for try in 1 2 3 4 5; do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8766/api/v1/state)" = 403 ]; then
    trap - EXIT
    exit 0
  fi
  sleep 1
done
echo "Private service failed its startup check." >&2
exit 1
