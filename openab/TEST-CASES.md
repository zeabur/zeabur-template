# OpenAB Template Test Cases

Test cases for validating the OpenAB Kiro template (`6VG49F`) after each update.

## Scope

These tests cover the Zeabur template deployment only — not OpenAB internals or Kiro CLI behavior.

---

## Level 1 — Smoke Tests

Verify the service starts (or sleeps) correctly based on which tokens are provided.

**Method:** Deploy template → wait for container → check runtime log for keyword → delete service.

| ID | Variables Set | Expected Log Keyword | Notes |
|----|--------------|----------------------|-------|
| S1 | *(none)* | `sleeping` | Service must not crash |
| S2 | `DISCORD_BOT_TOKEN` | `discord bot connected` | Slack adapter must not start |
| S3 | `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` | Slack adapter connected | Discord adapter must not start |
| S4 | `DISCORD_BOT_TOKEN` + `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` | `discord bot connected` + Slack connected | Both adapters up |
| S5 | `DISCORD_BOT_TOKEN` + `KIRO_API_KEY` | `discord bot connected` | No device flow prompt in log |
| S6 | `DISCORD_BOT_TOKEN` *(no `KIRO_API_KEY`)* | `discord bot connected` | Kiro awaiting device flow login |

---

## Level 2 — Integration Tests

Verify the bot receives messages and invokes the Kiro CLI backend.

**Method:** S2/S4/S5 service running → send message via Discord Bot API or Slack API (curl) → poll runtime log → check Kiro was invoked.

| ID | Precondition | Action | Expected |
|----|-------------|--------|----------|
| I1 | S5 (Discord + API Key) | @mention bot in allowed channel | Log shows `kiro-cli` invoked |
| I2 | S4 + API Key (Slack) | @mention bot in Slack channel | Log shows `kiro-cli` invoked |
| I3 | S5 + `OPENAB_ALLOWED_CHANNELS` set | Send message from *unlisted* channel | No session started in log |
| I4 | S5 + `OPENAB_ALLOWED_USERS` set | Send message from *unlisted* user | No session started in log |
| I5 | S5 (Discord + API Key) | Send follow-up in existing thread | Same session ID reused in log |

---

## Level 3 — E2E Tests

Verify the bot actually replies in Discord/Slack.

**Method:** Send message via API → poll Discord/Slack API for bot reply → assert reply exists within timeout.

| ID | Precondition | Action | Expected |
|----|-------------|--------|----------|
| E1 | S5 (Discord + API Key) | @mention: "reply with the word PONG" | Bot replies with "PONG" in thread |
| E2 | S4 + API Key (Slack) | @mention: "reply with the word PONG" | Bot replies with "PONG" in thread |
| E3 | E1 completed | Follow up in same thread: "what did you just say?" | Bot references previous reply (context maintained) |

---

## Test Data Requirements

| Item | Used In | Notes |
|------|---------|-------|
| `DISCORD_BOT_TOKEN` | S2, S4, S5, S6, I1, I3, I4, I5, E1, E3 | Dedicated test bot |
| `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` | S3, S4, I2, E2 | Dedicated test Slack app |
| `KIRO_API_KEY` | S5, I1, I2, I5, E1, E2, E3 | Pro/Pro+/Power subscription required |
| `OPENAB_ALLOWED_CHANNELS` | I3 | One known channel ID |
| `OPENAB_ALLOWED_USERS` | I4 | One known user ID |
| Test Discord channel ID | I1, I3, I5, E1, E3 | Bot must be invited |
| Test Slack channel ID | I2, E2 | Bot must be `/invite`d |
| Non-allowed channel ID | I3 | Must NOT be in `OPENAB_ALLOWED_CHANNELS` |
| Non-allowed user ID | I4 | Must NOT be in `OPENAB_ALLOWED_USERS` |
| Zeabur test project ID | All | Dedicated project for test deployments |

---

## Pass / Fail Criteria

- **Smoke:** Log keyword present within 60s of container start
- **Integration:** Kiro invocation log present within 30s of message sent
- **E2E:** Bot reply present in channel within 120s of message sent

---

## Out of Scope

- Kiro CLI authentication internals (device flow browser interaction — S6 is manual only)
- STT (voice message) functionality
- GitHub CLI integration
- Multi-agent (`allow_bot_messages`) scenarios
