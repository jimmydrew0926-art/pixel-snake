@echo off
REM 第一步：切换到脚本所在目录，避免从其他位置启动时找不到页面。
cd /d "%~dp0"

REM 第二步：使用 Windows 默认浏览器打开游戏，无需安装 Node.js。
start "" "%~dp0index.html"

REM 第三步：启动完成后立即关闭命令窗口。
exit /b 0
