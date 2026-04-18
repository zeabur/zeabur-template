# OpenAB Kiro Template — Implementation Plan

## Current Status

- Template published: https://zeabur.com/templates/6VG49F
- Template file: `zeabur-template-openab-kiro-6VG49F.yaml`
- Test cases defined: `TEST-CASES.md`
- Smoke test script written: `smoke-test.sh` (S1–S6)

---

## What's Done

- [x] Publish Kiro template to Zeabur marketplace (`6VG49F`)
- [x] Add `KIRO_API_KEY` variable (Pro/Pro+/Power vs Free tier)
- [x] Reorder setup steps (pre-deploy → deploy → post-deploy)
- [x] Add Slack setup section to README (all 6 locales)
- [x] Define test matrix (Smoke / Integration / E2E)
- [x] Write smoke test script `smoke-test.sh` (S1–S6)
- [x] Write `.env.example`

---

## What's Next

### Phase 1 — Validate Smoke Tests
- [ ] Fill in `.env` with real test tokens (Discord, Slack, Kiro API Key)
- [ ] Run `./smoke-test.sh` and confirm S1–S6 all pass
- [ ] Fix any issues found in template startup script

### Phase 2 — Integration Tests (I1–I5)
- [ ] Write `integration-test.sh`
  - Send message via Discord Bot API (`curl`) → poll log for `kiro-cli` invocation
  - Test allowed_channels / allowed_users filtering (I3, I4)
  - Test thread session reuse (I5)
  - Slack variant (I2)
- [ ] Run and validate

### Phase 3 — E2E Tests (E1–E3)
- [ ] Write `e2e-test.sh`
  - Send message via Discord Bot API → poll Discord API for bot reply
  - Assert reply contains expected content within timeout
  - Slack variant (E2)
  - Multi-turn context test (E3)
- [ ] Run and validate

### Phase 4 — Automation
- [ ] Decide execution environment (GitHub Actions / Zeabur Cron / local)
- [ ] Wire tests to run automatically on template file changes
- [ ] Store test tokens as secrets

---

## Template Details

| Item | Value |
|------|-------|
| Template code | `6VG49F` |
| Template URL | https://zeabur.com/templates/6VG49F |
| Image | `ghcr.io/openabdev/openab:0.7.7` |
| Test project | `69db614add2c72686a03e7c3` (openab-team) |
| Agent backend | `kiro-cli acp --trust-all-tools` |
| Persistent volume | `/home/agent` |

## Variables

| Key | Required | Notes |
|-----|----------|-------|
| `DISCORD_BOT_TOKEN` | One of Discord/Slack | Message Content Intent must be enabled |
| `KIRO_API_KEY` | Optional | Pro/Pro+/Power only. Free tier uses device flow post-deploy |
| `OPENAB_ALLOWED_CHANNELS` | Optional | Comma-separated Discord channel IDs |
| `OPENAB_ALLOWED_USERS` | Optional | Comma-separated Discord user IDs |
| `SLACK_BOT_TOKEN` | One of Discord/Slack | `xoxb-...` |
| `SLACK_APP_TOKEN` | With Slack | `xapp-...`, Socket Mode |

## Auth Flows

- **Pro+ (API Key):** Set `KIRO_API_KEY` before deploy → automatic
- **Free (Device Flow):** Leave `KIRO_API_KEY` empty → after deploy, run in terminal:
  ```
  runuser -u agent -- kiro-cli login --use-device-flow
  ```
  Then restart service.

---

## Test Matrix Summary

### Smoke Tests (S1–S6) — `smoke-test.sh`
Deploy → check log keyword → delete

| ID | Condition | Expected |
|----|-----------|----------|
| S1 | No tokens | `sleeping` |
| S2 | Discord only | `discord bot connected` |
| S3 | Slack only | Slack adapter connected |
| S4 | Discord + Slack | Both connected |
| S5 | Discord + API Key | Connected, no device flow |
| S6 | Discord, no API Key | Connected, awaiting device flow |

### Integration Tests (I1–I5) — `integration-test.sh` *(pending)*
Send message via API → check log for kiro-cli invocation

| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| I1 | Discord + API Key | @mention bot | kiro-cli invoked |
| I2 | Slack + API Key | @mention bot | kiro-cli invoked |
| I3 | allowed_channels set | Message from unlisted channel | No session |
| I4 | allowed_users set | Message from unlisted user | No session |
| I5 | Discord + API Key | Thread follow-up | Same session reused |

### E2E Tests (E1–E3) — `e2e-test.sh` *(pending)*
Send message → poll platform API → assert bot replied

| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| E1 | Discord + API Key | @mention: "reply with the word PONG" | Bot replies "PONG" |
| E2 | Slack + API Key | @mention: "reply with the word PONG" | Bot replies "PONG" |
| E3 | After E1 | Thread follow-up: "what did you just say?" | Context maintained |

### Pass/Fail Criteria
- Smoke: log keyword within 60s of start
- Integration: kiro invocation log within 30s of message
- E2E: bot reply within 120s of message
