@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env" copy ".env.example" ".env" >nul
echo.
echo 請在記事本中將 NOTION_TOKEN 改成您的 Notion Integration 權杖，儲存後關閉記事本。
echo 權杖只會保存在這台電腦，不會提交到 GitHub。
echo.
notepad ".env"
endlocal
