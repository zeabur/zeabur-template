# Changelog

本文檔記錄 OpenAB Copilot 模板的重要變更。

## [2026-04-15] - 初始版本

- 新增 OpenAB Copilot 模板（Discord → GitHub Copilot CLI 透過 ACP 橋接）
- 使用 `ghcr.io/openabdev/openab-copilot:0.7.5` 映像，預設 agent 後端為 `copilot --acp --stdio`
- 認證方式：部署後進入容器以 `gh auth login --hostname github.com --git-protocol https -p https -w` 完成 device flow（因 Copilot CLI 無 API key env 選項）
- 啟動腳本自帶 `gh auth status` 檢查，未認證時進入 sleep 並在 log 提示下一步
- 需付費 Copilot 訂閱（Pro / Pro+ / Business / Enterprise），Free 版不支援 CLI/ACP
- Copilot CLI ACP 支援自 2026-01 起處於 public preview，行為可能變動
- 提供 6 語系 README（en / zh-TW / zh-CN / ja-JP / es-ES / id-ID）
- 檔名未含 template code（尚未上傳至 Zeabur 官方 marketplace）
