@echo off
echo 正在启动 IDocker Registry 服务器测试...
echo.

echo 1. 检查 Node.js 版本...
node --version
echo.

echo 2. 检查 npm 版本...
npm --version
echo.

echo 3. 安装依赖...
npm install
echo.

echo 4. 初始化数据库...
npm run init-db
echo.

echo 5. 启动服务器...
npm start

pause