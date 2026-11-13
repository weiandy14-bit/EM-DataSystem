@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo 尚未安裝本機分析器，請先執行「啟動本機分析器.bat」。
  pause
  exit /b 2
)
".venv\Scripts\python.exe" -m em_analyzer.cli
pause
endlocal
