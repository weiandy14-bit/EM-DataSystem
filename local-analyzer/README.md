# EM-DataSystem 本機規範分析器

> 已停用：目前正式流程改由登入後的「規範合規檢查」直接進行線上分析，不需執行本資料夾內的 BAT 檔。此資料夾僅保留舊版紀錄。

本機分析器會透過 EM-DataSystem API 取得狀態為「待分析」的案件，下載 DOCX／PDF 至本機，擷取 CNS、標準、尺寸、壓力、溫度、容量、百分比、時間、電氣性能、介面及排他性文字，再由 Cloudflare Worker 把條件與 CNS 待查核紀錄寫回 Notion。電腦不需要保存 Notion 權杖。

## 第一次使用

1. 在 EM-DataSystem 的帳號管理中建立一個一般使用者帳號，例如「本機分析器」。
2. 雙擊 `設定本機分析器.bat`，填入該帳號與密碼後儲存。不需要 Notion Integration 或 Cloudflare Secret。
3. 雙擊 `啟動本機分析器.bat`。第一次啟動會自動建立獨立環境並安裝 PDF 解析套件。

分析器執行期間會每 60 秒檢查一次。視窗關閉後即停止，不影響系統中尚未處理的案件。登入後的「規範合規檢查」頁面可查看案件狀態與初篩結果。

## 本機資料

- `data/pending`：已領取、等待開始的文件。
- `data/processing`：分析中的文件。
- `data/completed`：已完成的原始文件副本。
- `data/failed`：分析失敗且需檢查的文件。
- `data/reports`：JSON 與 Markdown 初步分析報告。

上述資料及 `.env` 已排除於 Git 之外，不會提交到 GitHub。

## 判定界線

第一版是可追溯的規則式初篩，不會把尚未查證的結果冒充定案：

- CNS 引用會建立「待查核」紀錄，必須另外連接官方 CNS 資料來源後才能標示有效、廢止或取代。
- 三家產品只保存案件中的候選廠牌；逐條件符合性仍需原廠型錄或認證證據。
- 案件完成本機初篩後進入「待覆核」，由專業人員確認。

## 開發者驗證

```powershell
python -m unittest discover -s tests -v
```
