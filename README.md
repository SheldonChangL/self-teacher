# 自學小老師 Self-Teacher 🎒

> 給小朋友的 AI 拍照學習網站 — 拍張照片，AI 老師立刻幫你上一堂雙語課，再出個小測驗。

完全跑在本機，不用上雲、不用 API key。預期使用情境是 **電視當螢幕 + 手機當相機**：
電視瀏覽器開首頁 → 選小朋友 → 顯示 QR Code → 手機掃碼拍照 → 電視自動播課文。

## ✨ 主要功能

- **多位小朋友 profile**：頭像點選，無密碼，依年齡動態調整教材難度
- **6 個科目**：自由探索 / 國語 / 英文 / 數學 / 自然 / 社會 — 各有量身打造的教學風格
- **拍照即學**：手機拍 1~多張照片，後端 spawn `claude` CLI 分析圖片
- **串流課文**：Server-Sent Events 把生成中的 Markdown 一段段送到前端，邊出現邊朗讀
- **自動測驗**：課文流結束後，後端立刻在背景再呼叫 claude 出 5 題雙語單選題；小朋友讀完點「開始測驗」幾乎是秒開
- **電視/手機配對**：QR Code 內含 LAN IP（從 request `host` header 取）；手機上傳完，電視透過 SSE 自動跳到課文頁
- **雙語朗讀**：Web Speech API，中英文段落自動切換語音

## 🛠️ 技術組成

| 層 | 用什麼 | 為什麼 |
|---|---|---|
| 前後端 | Next.js 15 (App Router) + TypeScript | 全端整合，API routes 直接 spawn claude |
| 樣式 | Tailwind CSS v4 | 兒童友善的大按鈕配色 |
| DB | better-sqlite3 (本機檔案) | 零設定、零維運 |
| AI | `claude` CLI subprocess (`--output-format=stream-json --include-partial-messages`) | 直接重用使用者已登入的 CLI，不用管 API key |
| 多裝置同步 | Node `EventEmitter` + SSE | 同一個 process 內 publish/subscribe，無需 redis |
| QR Code | `qrcode` (server-side dataURL) | 從 request host header 自動帶入 LAN IP |
| TTS | Web Speech API | 瀏覽器內建，免費即時，支援 zh-TW + en-US |

## 🚀 快速開始

### 需求
- Node.js **18+**（建議 22）
- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) 已安裝且已登入（`claude --version` 能跑）

### 安裝
```bash
git clone https://github.com/SheldonChangL/self-teacher.git
cd self-teacher
npm install
```

### 跑起來
```bash
npm run dev
```
打開 `http://localhost:3000`（或同 LAN 的 `http://<電腦的-IP>:3000`）即可。

第一次進去會看到空白頭像列表，點「➕ 新增小朋友」建立 profile。

### 電視 + 手機模式
1. 電視瀏覽器開 `http://<電腦的-LAN-IP>:3000` → 選小朋友
2. 電視會顯示一個大 QR Code
3. 手機（同 Wi-Fi）相機掃 QR Code
4. 手機開啟拍照頁 → 選科目（國語 / 英文 / 數學 / 自然 / 社會 / 自由探索）→ 拍照 → 送出
5. 手機顯示「📺 送出囉！快回去看電視」
6. 電視自動跳到課文頁，邊串流邊播語音

## ⚙️ 環境變數

| 變數 | 預設 | 說明 |
|---|---|---|
| `SELF_TEACHER_MODEL` | `haiku` | 傳給 claude CLI `--model` 的值。可改 `sonnet` / `opus` 換更高品質但較慢 |
| `CLAUDE_BIN` | `claude` | Claude CLI 執行檔路徑（自訂安裝位置時用） |

## 📂 目錄結構

```
self-teacher/
├── app/
│   ├── page.tsx                              # 首頁：profile 頭像列表
│   ├── profile/new/page.tsx                  # 新增小朋友
│   ├── kid/[id]/page.tsx                     # 電視首頁：QR Code + 歷史
│   ├── kid/[id]/capture/page.tsx             # 拍照頁（同裝置 / 手機模式）
│   ├── kid/[id]/lesson/[sid]/page.tsx        # 課文頁（SSE 串流 + TTS）
│   ├── kid/[id]/quiz/[sid]/page.tsx          # 測驗頁
│   └── api/
│       ├── profiles/                         # GET/POST profile
│       ├── upload/                           # 圖片上傳
│       ├── lessons/[sid]/stream/             # SSE：spawn claude 生成課文
│       ├── quizzes/[sid]/                    # GET / 提交分數
│       └── profiles/[id]/events/             # SSE：電視收新 session 通知
├── components/
│   ├── PairingQR.tsx                         # 電視 QR + SSE 監聽
│   ├── Markdown.tsx                          # 串流友善的迷你 Markdown 渲染
│   ├── TTSButton.tsx                         # Web Speech API 中英自動切換
│   └── LoadingMascot.tsx                     # 等待動畫
├── lib/
│   ├── claude.ts                             # spawn claude CLI、解析 stream-json
│   ├── prompts.ts                            # 6 科目的 playbook
│   ├── subjects.ts                           # 純資料（前後端共用）
│   ├── db.ts                                 # better-sqlite3 + schema migration
│   ├── events.ts                             # in-process EventEmitter
│   ├── id.ts
│   └── quiz-runner.ts                        # 背景預生成測驗
├── uploads/                                  # 本機照片（已 gitignore）
└── data/                                     # SQLite 檔（已 gitignore）
```

## 🔒 隱私

- 小朋友的照片只存在本機 `uploads/`，從不上傳第三方
- SQLite DB 也在本機 `data/`
- 圖片分析雖透過 claude CLI 送到 Anthropic，但這跟你平常用 Claude Code 一樣，受同樣的 [data usage policy](https://www.anthropic.com/legal/privacy)
- 跨網路傳輸只發生在 LAN 內（手機 → 電腦），不過外網

## 🧠 教學風格設計

每個科目有專屬的 prompt playbook（在 `lib/prompts.ts`）：

| 科目 | 教學切角 |
|---|---|
| 🌈 自由探索 | Claude 自己挑主題，發現式學習 |
| 📖 國語 | 認字＋注音＋詞義＋造句 |
| 🔤 英文 | 拼字＋KK 音標＋生活例句 |
| 🔢 數學 | 用糖果舉例 → 步驟解 → 驗算 |
| 🌱 自然 | 觀察 → 解釋 → 邀請動手做小實驗 |
| 🌏 社會 | 故事化＋扣回小朋友的生活 |

教材難度依 profile.age 動態調整（5 歲以下用注音 + 短句，國中生講原理）。

## 🛣️ 還可以延伸

- 測驗也雙裝置：電視顯示題目，手機當搖桿
- 把常駐 `claude` 改成 interactive session，省掉每次冷啟動
- 家長端統計頁（哪科最常學、答對率）

## 📜 License

MIT
