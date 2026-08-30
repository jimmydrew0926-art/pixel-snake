# 像素贪吃蛇

一个零依赖、可离线运行的 HTML5 Canvas 小游戏，场上同时生成 4 颗苹果，并包含随进度递增的速度等级、键盘/触屏控制、实时计分、最高分保存、程序化 8-bit 背景音乐、合成音效、静音控制、暂停、结束提示和重新开始。

项目已支持 PWA：安卓 Chrome 可直接安装，iPhone Safari 可通过“共享 → 添加到主屏幕”安装，并在首次加载后支持离线游玩。

推送到 `main` 分支后，`.github/workflows/deploy-pages.yml` 会自动发布到 GitHub Pages。

## 环境检查

- Git：已检测到 `git version 2.53.0.windows.3`
- Node.js：当前系统命令行未检测到
- Node.js 官方下载地址：<https://nodejs.org/zh-cn/download>
- Git 官方下载地址：<https://git-scm.com/download/win>

本项目没有 npm 依赖，不安装 Node.js 也可以运行。

## 一键运行

双击项目根目录的 `start-game.bat`。脚本会使用默认浏览器直接打开游戏。

如果安装了 Node.js，也可以在项目目录运行：

```powershell
npx serve .
```

## 操作方式

- 方向键：控制移动
- 空格键：暂停/继续
- 开始游戏/重新开始按钮：开始新一局
- 声音开/关按钮：同时切换背景音乐和游戏音效，设置会自动保存
- 动态难度：开局保持基础速度，每吃 3 颗苹果提升一个速度等级，最高速度设有可玩性下限
- 手机或平板：使用棋盘下方的方向按钮

## 文件结构

```text
.
├── index.html          # 页面结构
├── css/style.css       # 响应式界面样式
├── js/game.js          # 游戏状态、输入、碰撞与绘制逻辑
├── assets/             # 安卓、iOS 和浏览器应用图标
├── manifest.json       # PWA 安装信息
├── service-worker.js   # 离线缓存
├── start-game.bat      # Windows 一键启动脚本
└── README.md           # 项目说明
```
