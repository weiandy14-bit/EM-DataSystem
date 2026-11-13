# EM-DataSystem 本機規範分析器

本機分析器會從 Notion 取得狀態為「待分析」的案件，下載 DOCX／PDF 至本機，擷取 CNS、標準、尺寸、壓力、溫度、容量、百分比、時間、電氣性能、介面及排他性文字，再把條件與 CNS 待查核紀錄寫回 Notion。

## 第一次使用

1. 在 Notion 建立或沿用可存取「規範合規檢查系統」頁面的 Integration。
2. 雙擊 `設定本機分析器.bat`，將 Integration 權杖貼入 `NOTION_TOKEN=` 後方並儲存。
3. 雙擊 `啟動本機分析器.bat`。第一次啟動會自動建立獨立環境並安裝 PDF 解析套件。

分析器執行期間會每 60 秒檢查一次。視窗關閉後即停止，不影響 Notion 中尚未處理的案件。

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
