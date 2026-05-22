@echo off
chcp 65001 >nul
echo 機電工程設備材料規格金額查詢系統
echo =====================================
echo 伺服器啟動中，請稍候...
cd /d C:\Users\User\me-system
start "" http://127.0.0.1:5000
python app.py
pause
