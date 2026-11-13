@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env" copy ".env.example" ".env" >nul
echo.
echo 請在記事本中填入 EM-DataSystem 一般使用者帳號與密碼，儲存後關閉記事本。
echo 不需要 Notion 權杖或 EMP-Checklist Integration；設定只保存在這台電腦，不會提交到 GitHub。
echo.
notepad ".env"
endlocal
