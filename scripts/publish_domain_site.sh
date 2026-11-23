#!/usr/bin/env bash
# Publish one staged domain site (scripts/stage_domain_sites.mjs output) to its
# own GitHub Pages repository. Runs in the Pages workflow after the release
# gates pass, using that repository's write deploy key.
#
#   DEPLOY_KEY=<private key> scripts/publish_domain_site.sh <site-id> <staged-dir> <owner/repo> <source-sha>
#
# The target keeps its own .github/ (its Pages workflow) and README.md; every
# other file mirrors the staged site. A push only happens when the site's content
# changed, or when the live site does not serve content the repository already has
# (scripts/domain_publish_plan.mjs). source.json embeds the source commit, so it
# differs on every run and does not count as content.
# For each directory in the site's keepPreviousAssets (scripts/domain-sites.json;
# KEEP_PREVIOUS_ASSETS overrides it), the hashed assets the previous
# release's index.html used stay published for one more deploy, so a tab opened
# just before the deploy can still load them (scripts/domain_keep_previous_assets.mjs).
set -euo pipefail

SITE="${1:?site id}"
STAGED="${2:?staged site directory}"
REPO="${3:?target repository}"
SHA="${4:?source commit}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEEP_HELPER="$SCRIPT_DIR/domain_keep_previous_assets.mjs"
WAIT_HELPER="$SCRIPT_DIR/wait_for_repository_run.mjs"
PLAN_HELPER="$SCRIPT_DIR/domain_publish_plan.mjs"
KEEP_PREVIOUS_ASSETS="${KEEP_PREVIOUS_ASSETS-$(node "$KEEP_HELPER" --apps "$SITE")}"
: "${DEPLOY_KEY:?DEPLOY_KEY is not set; add the repository secret named in scripts/domain-sites.json}"

[ -f "$STAGED/source.json" ] || { echo "FATAL: $STAGED is not a staged domain site (no source.json)"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
umask 077
printf '%s\n' "$DEPLOY_KEY" > "$WORK/key"
# Pin GitHub's published SSH host keys instead of trusting a first connection.
# Unauthenticated API calls from shared runners hit per-IP rate limits, so send
# the job token when the workflow provides one.
AUTH=()
[ -n "${GITHUB_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
curl -fsSL --retry 3 --retry-delay 5 ${AUTH[@]+"${AUTH[@]}"} https://api.github.com/meta \
  | python3 -c 'import json,sys; [print("github.com " + key) for key in json.load(sys.stdin)["ssh_keys"]]' \
  > "$WORK/known_hosts"
[ -s "$WORK/known_hosts" ] || { echo "FATAL: could not read GitHub's SSH host keys"; exit 1; }
export GIT_SSH_COMMAND="ssh -i $WORK/key -o IdentitiesOnly=yes -o UserKnownHostsFile=$WORK/known_hosts -o StrictHostKeyChecking=yes"

git clone --quiet --depth 1 "git@github.com:${REPO}.git" "$WORK/site"
# Snapshot what the previous release served before the mirror deletes it.
for app in ${KEEP_PREVIOUS_ASSETS:-}; do
  if [ -f "$WORK/site/$app/index.html" ]; then
    mkdir -p "$WORK/previous/$app"
    cp -R "$WORK/site/$app/index.html" "$WORK/site/$app/assets" "$WORK/previous/$app/" 2>/dev/null || true
  fi
done
rsync -a --delete --exclude='/.git/' --exclude='/.github/' --exclude='/README.md' "$STAGED"/ "$WORK/site"/
if [ -n "${KEEP_PREVIOUS_ASSETS:-}" ] && [ -d "$WORK/previous" ]; then
  # shellcheck disable=SC2086 # KEEP_PREVIOUS_ASSETS is a space-separated list
  node "$KEEP_HELPER" "$WORK/previous" "$WORK/site" $KEEP_PREVIOUS_ASSETS
fi

cd "$WORK/site"
git add -A
PLAN="$(node "$PLAN_HELPER" "$STAGED" "$WORK/site")"
ACTION="${PLAN%%$'\t'*}"
REASON="${PLAN#*$'\t'}"
if [ "$ACTION" = skip ]; then
  echo "OK: ${REPO} already serves ${SITE} (${REASON}); nothing to publish."
  exit 0
fi
echo "Publishing ${SITE} to ${REPO}: ${REASON}."
# An identical tree still needs a commit when the live site is stale, to start another Pages deploy.
ALLOW_EMPTY=()
if git diff --cached --quiet; then ALLOW_EMPTY=(--allow-empty); fi
git -c user.name="system-by-dave publisher" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit --quiet ${ALLOW_EMPTY[@]+"${ALLOW_EMPTY[@]}"} -m "Publish ${SITE} from DaveHomeAssist/system-by-dave@${SHA:0:12}"
git push --quiet origin HEAD:main
TARGET_SHA="$(git rev-parse HEAD)"
echo "OK: published ${SITE} to ${REPO} (${TARGET_SHA:0:12})."
# The destination Pages workflow (concurrency group "pages") deploys this push.
# Reading HTTPS before that run finishes caches the previous release for max-age=600.
#
# That workflow's deploy step fails now and then on GitHub's side: the artifact it
# uploaded a second earlier is not listed yet (housevideo and avbydave on 2026-11-21).
# A fresh run fixes it, and this script can start one: an empty commit is a new push.
# The site's files are already in place, so nothing about the release changes.
# PUBLISH_ATTEMPTS (default 3) bounds the tries.
ATTEMPTS="${PUBLISH_ATTEMPTS:-3}"
attempt=1
until node "$WAIT_HELPER" "$REPO" "$TARGET_SHA"; do
  if [ "$attempt" -ge "$ATTEMPTS" ]; then
    echo "FATAL: ${REPO} did not deploy ${SITE} after ${attempt} Pages runs."
    exit 1
  fi
  attempt=$((attempt + 1))
  echo "Pages run for ${REPO} @ ${TARGET_SHA:0:12} did not succeed; starting run ${attempt} of ${ATTEMPTS} with an empty commit."
  git -c user.name="system-by-dave publisher" \
      -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit --quiet --allow-empty -m "Run Pages again for ${SITE} from DaveHomeAssist/system-by-dave@${SHA:0:12}"
  git push --quiet origin HEAD:main
  TARGET_SHA="$(git rev-parse HEAD)"
done
