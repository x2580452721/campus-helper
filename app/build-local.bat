@echo off
echo ========================================
echo Campus Helper - 本地构建脚本
echo ========================================
echo.

echo [1/5] 检查 Node.js...
node --version
if %errorlevel% neq 0 (
    echo 错误: 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

echo.
echo [2/5] 安装依赖...
cd /d "%~dp0"
call npm install

echo.
echo [3/5] 添加 Android 平台...
call npm run cap:add:android 2>nul
call npm run cap:sync

echo.
echo ========================================
echo 准备完成！
echo ========================================
echo.
echo 下一步：
echo 1. 安装 Android Studio: https://developer.android.com/studio
echo 2. 运行: npm run cap:open:android
echo 3. 在 Android Studio 中构建 APK
echo.
echo 或者使用 GitHub Actions 自动构建（推荐）：
echo - 将代码推送到 GitHub，Actions 会自动构建 APK
echo.
pause
