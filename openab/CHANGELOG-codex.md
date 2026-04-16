# Changelog

本文檔記錄 OpenAB Codex 模板的重要變更。

## [2026-04-15] - 升級至 OpenAB v0.7.5

### 變更

- 映像標籤直接釘選為 `0.7.5`（原本使用 `:latest`）
- Readme 改為「使用固定版本，升級請自行更換 tag」的敘述
- 啟動腳本改用 `openab run <config>` 子指令

### 上游 v0.7.3 → v0.7.5 重點

- **v0.7.4**
  - 新增 `discord.allow_bot_messages`（`off` / `mentions` / `all`）與 `trusted_bot_ids` 設定，支援 multi-agent bot 互通
  - 所有 Dockerfile 的 CLI 版本以 ARG 固定，確保 reproducible build
  - Dockerfile CMD 改為 `["run", ...]`（clap 子指令化）
- **v0.7.5**
  - STT 停用時對語音訊息回覆 🎤 reaction 以提示使用者

### 備註

- `config.toml` 僅於首次啟動由內建範本生成；升級後若要啟用 `allow_bot_messages` 等新選項，請直接編輯 `/home/node/.config/openab/config.toml`

## [2026-04-12] - 初始版本

- 新增 OpenAB Codex 模板（Discord → Codex CLI 透過 ACP 橋接）
- 使用 `ghcr.io/openabdev/openab-codex` 映像，預設 agent 後端為 `codex-acp`
- 支援 OpenAI API key 或部署後 device flow 認證
- 提供 6 語系 README（en / zh-TW / zh-CN / ja-JP / es-ES / id-ID）
