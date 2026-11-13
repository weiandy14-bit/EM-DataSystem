@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env" copy ".env.example" ".env" >nul
echo.
echo 請在記事本中填入本機分析器連線金鑰，儲存後關閉記事本。
echo 不需要 Notion 權杖；連線金鑰只會保存在這台電腦，不會提交到 GitHub。
echo.
notepad ".env"
endlocal
