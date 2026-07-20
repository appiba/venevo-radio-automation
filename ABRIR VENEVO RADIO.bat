@echo off
setlocal
title Venevo Radio Automation - NO CERRAR
cd /d "%~dp0"
echo Iniciando Venevo Radio Automation...
echo.
echo No cierres esta ventana mientras estes usando la radio.
echo Se abrira Venevo en http://localhost:5173 o un puerto cercano.
echo.
set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" "%~dp0servidor-venevo-local.js"
echo.
echo La app se detuvo. Puedes cerrar esta ventana.
pause
