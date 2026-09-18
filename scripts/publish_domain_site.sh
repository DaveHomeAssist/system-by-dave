#!/usr/bin/env bash
# Publish one staged domain site (scripts/stage_domain_sites.mjs output) to its
# own GitHub Pages repository. Runs in the Pages workflow after the release
# gates pass, using that repository's write deploy key.
#
#   DEPLOY_KEY=<private key> scripts/publish_domain_site.sh <site-id> <staged-dir> <owner/repo> <source-sha>
#
# The target keeps its own .github/ (its Pages workflow) and README.md; every
# other file mirrors the staged site. A push only happens when content changed.
set -euo pipefail

SITE="${1:?site id}"
STAGED="${2:?staged site directory}"
REPO="${3:?target repository}"
SHA="${4:?source commit}"
: "${DEPLOY_KEY:?DEPLOY_KEY is not set; add the repository secret named in scripts/domain-sites.json}"

[ -f "$STAGED/source.json" ] || { echo "FATAL: $STAGED is not a staged domain site (no source.json)"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
umask 077
printf '%s\n' "$DEPLOY_KEY" > "$WORK/key"
# Pin GitHub's published SSH host keys instead of trusting a first connection.
curl -fsSL https://api.github.com/meta \
  | python3 -c 'import json,sys; [print("github.com " + key) for key in json.load(sys.stdin)["ssh_keys"]]' \
  > "$WORK/known_hosts"
export GIT_SSH_COMMAND="ssh -i $WORK/key -o IdentitiesOnly=yes -o UserKnownHostsFile=$WORK/known_hosts -o StrictHostKeyChecking=yes"

git clone --quiet --depth 1 "git@github.com:${REPO}.git" "$WORK/site"
rsync -a --delete --exclude='/.git/' --exclude='/.github/' --exclude='/README.md' "$STAGED"/ "$WORK/site"/

cd "$WORK/site"
git add -A
if git diff --cached --quiet; then
  echo "OK: ${REPO} already matches ${SITE} from ${SHA:0:12}; nothing to publish."
  exit 0
fi
git -c user.name="system-by-dave publisher" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit --quiet -m "Publish ${SITE} from DaveHomeAssist/system-by-dave@${SHA:0:12}"
git push --quiet origin HEAD:main
echo "OK: published ${SITE} to ${REPO} ($(git rev-parse --short HEAD))."
