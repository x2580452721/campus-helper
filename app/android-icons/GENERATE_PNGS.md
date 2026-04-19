# 生成PNG图标指南

## 方法1：使用 icon-generator.html（推荐）⭐

1. 在浏览器中打开 `../icon-generator.html`
2. 点击 "📦 下载全部尺寸"
3. 将下载的PNG文件放到对应的文件夹：
   - `ic_launcher-1024.png` → `icon-1024/ic_launcher.png`
   - `ic_launcher-512.png` → `icon-512/ic_launcher.png`
   - `ic_launcher-192.png` → `mipmap-xxxhdpi/ic_launcher.png`
   - `ic_launcher-144.png` → `mipmap-xxhdpi/ic_launcher.png`
   - `ic_launcher-96.png` → `mipmap-xhdpi/ic_launcher.png`
   - `ic_launcher-72.png` → `mipmap-hdpi/ic_launcher.png`
   - `ic_launcher-48.png` → `mipmap-mdpi/ic_launcher.png`

## 方法2：在线转换

1. 访问 https://convertio.co/zh/svg-png/
2. 上传 `icon.svg`
3. 分别转换为 1024/512/192/144/96/72/48 尺寸
4. 放到对应文件夹

## 方法3：使用 Node.js (需要 puppeteer)

```bash
cd app
npm install puppeteer --save-dev
node scripts/generate-icons.js
```

---

## 📋 图标文件结构

```
android-icons/
├── mipmap-mdpi/          # 48x48
│   └── ic_launcher.png
├── mipmap-hdpi/          # 72x72
│   └── ic_launcher.png
├── mipmap-xhdpi/         # 96x96
│   └── ic_launcher.png
├── mipmap-xxhdpi/        # 144x144
│   └── ic_launcher.png
├── mipmap-xxxhdpi/       # 192x192
│   └── ic_launcher.png
├── icon-512/             # 512x512
│   └── ic_launcher.png
├── icon-1024/            # 1024x1024
│   └── ic_launcher.png
└── icon.svg              # SVG源文件
```

---

## 🎯 快速开始

**最简单的方式**：用浏览器打开 `app/icon-generator.html`，点击下载全部，然后拖到对应文件夹！

然后提交代码，GitHub Actions 会自动构建带有新图标的APK！
