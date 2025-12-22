@echo off
chdir /d "%~dp0"
echo Starting development server...
echo Current directory: %CD%
npm run dev:client
pause