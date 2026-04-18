# Campus Helper 应用图标设置指南

## 🎨 图标设计概览

我们为你设计了5种精美的图标方案：

- **设计 A - 简约渐变** （推荐）：青色-蓝色-绿色渐变，简约现代
- **设计 B - 浅色背景**：白色背景，适合在浅色主题中使用
- **设计 C - 活力粉紫**：粉紫渐变，更有活力
- **设计 D - 任务卡片**：任务卡片风格，突出任务功能
- **设计 E - 书本堆叠**：书本堆叠，突出教育属性

## 📱 预览图标

在浏览器中打开 `icon-design.html` 文件即可预览所有图标设计，并可以下载不同尺寸的PNG文件。

## 🔧 在 Capacitor 中设置图标

### 方法 1: 使用 Capacitor Assets（推荐）

1. 安装依赖：
```bash
cd app
npm install @capacitor/assets --save-dev
```

2. 准备源图标：
- 将你选择的图标保存为 `app/icon.png` (1024x1024)
- 将启动画面保存为 `app/splash.png` (2732x2732)

3. 生成所有平台的图标：
```bash
npx capacitor-assets generate --android
# 或者同时生成iOS:
npx capacitor-assets generate --android --ios
```

### 方法 2: 使用 cordova-res（传统方式）

1. 安装依赖：
```bash
cd app
npm install cordova-res --save-dev
```

2. 准备源文件：
```
app/
├── icon.png (1024x1024)
└── splash.png (2732x2732)
```

3. 生成图标：
```bash
npx cordova-res android --skip-config --copy
```

### 方法 3: 手动替换 Android 图标

如果你选择了设计A（简约渐变），可以：

1. 打开 `icon-design.html` 预览并下载
2. 下载 1024x1024、512x512、256x256、192x192、144x144、96x72、72x72、48x48、36x36 等尺寸
3. 替换 `app/android/app/src/main/res/` 下的 mipmap 文件夹中的图标

## 📐 Android 所需图标尺寸

| 文件夹 | 尺寸 | 用途 |
|--------|------|------|
| mipmap-mdpi | 48x48 | 基础 |
| mipmap-hdpi | 72x72 | 高密度 |
| mipmap-xhdpi | 96x96 | 超高密度 |
| mipmap-xxhdpi | 144x144 | 超超高密度 |
| mipmap-xxxhdpi | 192x192 | 超超超高密度 |
| mipmap-anydpi-v26 | 自适应 | 自适应图标（Android 8.0+） |

## 🎯 快速开始

1. 打开 `app/icon-design.html` 在浏览器中预览
2. 点击你喜欢的图标的 "Download" 按钮
3. 会自动下载 1024、512、256 三个尺寸
4. 选择一个作为主图标，重命名为 `icon.png`（1024x1024）
5. 使用上述方法生成或手动替换图标

## 💡 推荐方案

**推荐使用设计 A（简约渐变）**，因为：
- 符合开屏动画的配色
- 现代简约风格
- 在不同背景下都很醒目
- 青色-蓝色-绿色渐变传达活力和专业感

## 📝 注意事项

- 确保图标是正方形的
- 主要内容应该在安全区域内（不要太靠近边缘）
- 对于 Android 8.0+，建议使用自适应图标
- 测试在深色和浅色主题下的显示效果
