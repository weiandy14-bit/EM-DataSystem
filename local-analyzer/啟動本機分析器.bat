@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env" (
  echo 尚未完成設定，請先執行「設定本機分析器.bat」。
  pause
  exit /b 2
)
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  if errorlevel 1 goto :error
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
  if errorlevel 1 goto :error
)
".venv\Scripts\python.exe" -m em_analyzer.cli --watch
if errorlevel 1 goto :error
exit /b 0
:error
echo.
echo 本機分析器啟動失敗，請保留本視窗中的錯誤訊息。
pause
exit /b 1
