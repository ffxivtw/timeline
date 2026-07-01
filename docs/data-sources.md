# 版本更新日期資料來源與查詢方法

本文件記錄各伺服器版本上線日期的**權威來源**與**查詢步驟**，供日後維護
`src/data/versions.ts` 時重複使用。所有日期均為**實際上線日**（改版維護日），
非「更新筆記發佈日」。

> ⚠️ 重要教訓：更新筆記（patch notes）通常在改版**前幾天**就發佈，
> 其發佈日 **不等於** 版本上線日。務必以「改版維護日」為準。

---

## 國際服（Global）— 基準

**來源**：consolegameswiki 的 Patches 頁
`https://ffxiv.consolegameswiki.com/wiki/Patches`

**方法**：可直接用 WebFetch 讀取（無反爬蟲），頁面完整列出每個版本（含 .0/.05/.1/.15…）
的實際上線日。

**注意**：版本號的字串大小 ≠ 時間先後。FFXIV 的順序是
`7.1 → 7.15 → 7.16 → 7.2 → 7.21 → 7.25 → 7.3 …`，程式一律**依國際服日期排序**。
（曾誤把 7.16 的日期填成 7.15；正確：7.15 = 2024-12-17、7.16 = 2025-01-21。）

國際服日期是所有跨服預估的基準，優先確保其正確。

---

## 繁中服（Traditional Chinese）

繁中官網為 JS 動態渲染，版本頁與更新筆記頁的靜態 HTML **不含日期**，需從
news（ASP.NET）系統的「改版維護公告」取得。

### 步驟

1. **確認目前有哪些版本**（僅版本清單，無日期）：
   `https://www.ffxiv.com.tw/web/special/patchnote_log/index.html`
   - 註解掉（`<!-- -->`）的版本代表**尚未上線**（例如 7.2 頁面已備好但被註解）。

2. **取得實際上線日** ← 關鍵：
   - 消息列表：`https://www.ffxiv.com.tw/web/news/news_list.aspx`
     - 分頁 `?page=N`、分類 `?category=N`。
     - 每則 `div.item` 有 `div.title > a[href]`、`div.publish_date`、`div.type`。
   - 找該版本的**改版維護公告**（非「更新筆記」），開啟其
     `news_content.aspx?id=…` 內容頁。
   - 內文會寫「**我們預計將於 MM/DD HH:MM 進行改版維護**」——該 `MM/DD` 即上線日。
     - 範例：7.15 公告 `id=mPeMl8odRa` → 內文「預計將於 **06/23** 13:00」→ 7.15 = 2026-06-23。
   - `publish_date`（更新筆記發佈日）通常早改版數日，**不可**當上線日。

3. **開服版本（7.0）**：正式開服 **2025-12-10**（搶先體驗 2025-11-27），開服即含 7.0。

### 已查證（校準用）
| 版本 | 上線日 | 星期 |
|---|---|---|
| 7.0 | 2025-12-10 | 開服 |
| 7.05 | 2026-03-10 | 二 |
| 7.1 | 2026-04-21 | 二 |
| 7.15 | 2026-06-23 | 二 |

> 繁中改版固定在**週二**；預估演算法會把結果對齊到週二（見 `src/lib/prediction.ts`
> 的 `dominantWeekday` / `snapToWeekday`）。

---

## 中服（China）— 參考資料

**來源**：huijiwiki「版本時間表」
`https://ff14.huijiwiki.com/wiki/版本时间表`

**方法**：該站有 **Cloudflare** 阻擋，WebFetch 與一般 curl 皆會被 "Just a moment…" 擋下。
改用 **Wayback Machine 快照**：

1. 查最近快照：
   `http://archive.org/wayback/available?url=ff14.huijiwiki.com/wiki/版本时间表`
2. 抓回傳的 `closest.url`（`http://web.archive.org/web/<timestamp>/…`）。
3. 表格每列為「版本｜國際服日期｜國服日期」。

**重點**：中服自 **7.4 起與國際服完全同步**（同日上線）。

---

## 韓服（Korea）— 參考資料

**來源**：韓服官網更新筆記
`https://www.ff14.co.kr/news/patchnote`

**方法**：
- 列表頁：主要版本（.0/.1/.2/.3/.4/.5）的日期在各版群組的 `<time>` 標籤。
- 小版本（.15/.25/.35/.45）：各自的更新筆記內頁
  `https://www.ff14.co.kr/news/notice/view/<id>`，內文的 `YYYY년 M월 D일` 為上線日
  （頁面內的 `2025.5.22` 是無關的腳本註解，需忽略）。

**重點**：韓服落後幅度逐版縮小，**7.5 已追平國際服**（同日 2026-04-28）。

---

## 通用查詢技巧

- 優先用 WebFetch；被擋（403 / Cloudflare）時改用帶瀏覽器 UA 的 curl；再不行用 Wayback。
- JS 動態頁：先看是否有 news/API（`.aspx`、`news_content` 等）承載真實資料。
- 解析清單頁時以結構化選擇器（`div.item`、`publish_date` 等）擷取「標題＋日期＋分類」。
- 跨服對照一律以**國際服日期排序**，勿用版本號字串排序。

---

## 維護 `src/data/versions.ts` 時

1. 依上述來源取得**實際上線日**填入對應 `releases`。
2. 未上線的伺服器留空即可（程式會據此推估）。
3. 若某服新增了「開服首發批次」之類會扭曲節奏的版本，於
   `cadenceExcludedVersions` 標記排除（目前 `tw: ['7.0']`）。
4. 預估的積極度可調 `src/lib/prediction.ts` 的 `CATCHUP_AGGRESSIVENESS`。
