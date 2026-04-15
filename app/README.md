# Campus Helper App - 使用 Vercel H5 打包原生 App

本方案使用 Capacitor 将 Vercel 上已部署的 H5 版本打包成原生 Android/iOS App。

## 优势

- ✅ 无需本地构建 H5 代码
- ✅ 热更新：App 打开时自动加载 Vercel 最新版本
- ✅ 开发效率高：只需更新 Vercel，App 自动更新
- ✅ 一套代码多端运行

## 前置要求

- Node.js 18+
- npm 或 yarn
- **Android**: Android Studio (用于打包 Android App)
- **iOS**: macOS + Xcode (用于打包 iOS App)

## 快速开始

### 1. 配置 Vercel 地址

首先，你需要修改两个文件中的 Vercel 地址：

1. `capacitor.config.ts` - 找到 `url` 字段，替换为你的实际 Vercel 地址
2. `www/index.html` - 找到 `window.location.href`，替换为同样的地址

```typescript
// capacitor.config.ts
server: {
  url: 'https://your-actual-project.vercel.app', // 替换为你的地址
  // ...
}
```

### 2. 安装依赖

```bash
cd app
npm install
```

### 3. 初始化 Capacitor（如果需要）

```bash
npm run cap:init
# 按提示输入 App 名称和包名
```

### 4. 添加平台

#### Android

```bash
npm run cap:add:android
```

#### iOS (仅 macOS)

```bash
npm run cap:add:ios
```

### 5. 同步配置

每次修改 `capacitor.config.ts` 后都需要运行：

```bash
npm run cap:sync
```

### 6. 打开 IDE 进行打包

#### Android

```bash
npm run cap:open:android
```

这会打开 Android Studio，然后你可以：
1. 等待 Gradle 同步完成
2. 点击菜单 `Build` -> `Generate Signed Bundle / APK`
3. 选择 `APK` 或 `Android App Bundle`
4. 按照向导完成签名和打包

#### iOS

```bash
npm run cap:open:ios
```

这会打开 Xcode，然后你可以：
1. 选择你的开发团队（用于签名）
2. 选择目标设备（真机或模拟器）
3. 点击 `Product` -> `Archive`
4. 按照向导导出 IPA 文件

## 项目结构

```
app/
├── package.json          # Capacitor 依赖管理
├── capacitor.config.ts   # Capacitor 主配置文件
├── www/
│   └── index.html        # Fallback 页面（远程加载失败时显示）
├── android/              # Android 平台代码（添加后生成）
└── ios/                  # iOS 平台代码（添加后生成）
```

## 常见问题

### Q: 如何测试 App？

A: 
- Android: 在 Android Studio 中连接真机或启动模拟器，点击运行按钮
- iOS: 在 Xcode 中选择模拟器或连接真机，点击运行按钮

### Q: 远程加载失败怎么办？

A: `www/index.html` 提供了 fallback 机制，如果远程加载失败，会显示加载页面并在 3 秒后尝试跳转。

### Q: 如何添加推送通知等原生功能？

A: 可以安装 Capacitor 插件：
```bash
npm install @capacitor/push-notifications
npx cap sync
```

### Q: Vercel 更新后 App 会立即更新吗？

A: 是的！因为 App 直接加载 Vercel 的网页，用户下次打开 App 时就会看到最新版本。

### Q: 可以同时加载本地 H5 吗？

A: 可以！只需注释掉 `capacitor.config.ts` 中的 `url` 字段，然后把本地构建的 H5 产物放到 `www` 目录即可。

## 相关文档

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Android 打包指南](https://capacitorjs.com/docs/android)
- [iOS 打包指南](https://capacitorjs.com/docs/ios)
