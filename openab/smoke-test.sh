#!/bin/sh
# OpenAB Kiro Template — Smoke Tests (S1–S6)
# Usage: ./smoke-test.sh
# Requires: .env in same directory, npx, zeabur CLI

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/zeabur-template-openab-kiro-6VG49F.yaml"
PROJECT_ID="69db614add2c72686a03e7c3"
LOG_WAIT=30   # seconds to wait for container to start before checking logs
LOG_LINES=20  # log lines to check

PASS=0
FAIL=0
ERRORS=""

# Load .env
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "ERROR: .env not found. Copy .env.example and fill in values."
  exit 1
fi
# shellcheck disable=SC1091
. "$SCRIPT_DIR/.env"

# ─── helpers ────────────────────────────────────────────────────────────────

deploy() {
  # deploy <var_args...>
  # deploys template and prints the new service ID
  npx zeabur@latest template deploy -i=false \
    -f "$TEMPLATE_FILE" \
    --project-id "$PROJECT_ID" \
    "$@" 2>/dev/null

  # get the most recently created openab service ID
  npx zeabur@latest service list --project-id "$PROJECT_ID" -i=false 2>/dev/null \
    | grep "openab" \
    | awk '{print $1}' \
    | tail -1
}

check_log() {
  # check_log <service_id> <keyword>
  SERVICE_ID="$1"
  KEYWORD="$2"
  npx zeabur@latest deployment log --service-id "$SERVICE_ID" -t runtime -i=false 2>/dev/null \
    | tail -"$LOG_LINES" \
    | grep -qi "$KEYWORD"
}

delete_service() {
  npx zeabur@latest service delete --id "$1" -i=false -y 2>/dev/null || true
}

run_test() {
  # run_test <id> <description> <keyword> <var_args...>
  TEST_ID="$1"
  DESC="$2"
  KEYWORD="$3"
  shift 3

  printf "%-4s %-52s ... " "$TEST_ID" "$DESC"

  SERVICE_ID="$(deploy "$@")"
  if [ -z "$SERVICE_ID" ]; then
    printf "FAIL (deploy error)\n"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n$TEST_ID: deploy failed"
    return
  fi

  sleep "$LOG_WAIT"

  if check_log "$SERVICE_ID" "$KEYWORD"; then
    printf "PASS\n"
    PASS=$((PASS + 1))
  else
    printf "FAIL (keyword not found: '%s')\n" "$KEYWORD"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n$TEST_ID: log keyword '$KEYWORD' not found"
  fi

  delete_service "$SERVICE_ID"
}

# ─── test cases ─────────────────────────────────────────────────────────────

echo ""
echo "OpenAB Kiro — Smoke Tests"
echo "Project: $PROJECT_ID"
echo "Template: $TEMPLATE_FILE"
echo "─────────────────────────────────────────────────────────────────────"

# S1: No tokens → service should sleep
run_test S1 "No tokens → sleeping" \
  "sleeping" \
  --var DISCORD_BOT_TOKEN="" \
  --var KIRO_API_KEY="" \
  --var OPENAB_ALLOWED_CHANNELS="" \
  --var OPENAB_ALLOWED_USERS="" \
  --var SLACK_BOT_TOKEN="" \
  --var SLACK_APP_TOKEN=""

# S2: Discord only → discord bot connected
run_test S2 "Discord only → discord bot connected" \
  "discord bot connected" \
  --var "DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN" \
  --var KIRO_API_KEY="" \
  --var OPENAB_ALLOWED_CHANNELS="" \
  --var OPENAB_ALLOWED_USERS="" \
  --var SLACK_BOT_TOKEN="" \
  --var SLACK_APP_TOKEN=""

# S3: Slack only → slack adapter started
run_test S3 "Slack only → slack adapter started" \
  "slack" \
  --var DISCORD_BOT_TOKEN="" \
  --var KIRO_API_KEY="" \
  --var OPENAB_ALLOWED_CHANNELS="" \
  --var OPENAB_ALLOWED_USERS="" \
  --var "SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN" \
  --var "SLACK_APP_TOKEN=$SLACK_APP_TOKEN"

# S4: Discord + Slack → both adapters up
run_test S4 "Discord + Slack → both adapters connected" \
  "discord bot connected" \
  --var "DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN" \
  --var KIRO_API_KEY="" \
  --var OPENAB_ALLOWED_CHANNELS="" \
  --var OPENAB_ALLOWED_USERS="" \
  --var "SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN" \
  --var "SLACK_APP_TOKEN=$SLACK_APP_TOKEN"

# S5: Discord + KIRO_API_KEY → no device flow prompt
run_test S5 "Discord + KIRO_API_KEY → no device flow prompt" \
  "discord bot connected" \
  --var "DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN" \
  --var "KIRO_API_KEY=$KIRO_API_KEY" \
  --var OPENAB_ALLOWED_CHANNELS="" \
  --var OPENAB_ALLOWED_USERS="" \
  --var SLACK_BOT_TOKEN="" \
  --var SLACK_APP_TOKEN=""

# S6: Discord, no KIRO_API_KEY → service up, awaiting device flow
run_test S6 "Discord, no KIRO_API_KEY → awaiting device flow" \
  "discord bot connected" \
  --var "DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN" \
  --var KIRO_API_KEY="" \
  --var OPENAB_ALLOWED_CHANNELS="" \
  --var OPENAB_ALLOWED_USERS="" \
  --var SLACK_BOT_TOKEN="" \
  --var SLACK_APP_TOKEN=""

# ─── summary ────────────────────────────────────────────────────────────────

echo "─────────────────────────────────────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  printf "\nFailed tests:%b\n" "$ERRORS"
  exit 1
fi
