# 📱 Campus Helper App 完整构建和发布指南

这个指南会帮你解决：
- ✅ Android APK 无法定位的问题
- ✅ iOS App 发布到 App Store
- ✅ 完整的开发和打包流程

---

## 📋 目录

1. [当前问题分析](#当前问题分析)
2. [Android 解决方案](#android-解决方案)
3. [iOS 完整发布流程](#ios-完整发布流程)
4. [本地测试流程](#本地测试流程)

---

## 当前问题分析

### 为什么 GitHub 打包的 APK 无法定位？

**问题原因：**
1. AndroidManifest.xml 中缺少定位权限声明
2. Capacitor Geolocation 插件没有正确同步
3. 构建流程没有正确初始化平台

---

## Android 解决方案

### 方案一：本地完整构建（推荐）

#### 1. 前置要求

- ✅ Node.js 18+
- ✅ Java 17
- ✅ Android Studio（可选，但推荐）
- ✅ Windows/Mac/Linux

#### 2. 本地构建步骤

**步骤 1：安装依赖和初始化平台**

```bash
# 进入 app 目录
cd app

# 安装依赖
npm install

# 添加 Android 平台
npx cap add android

# 同步 H5 构建产物（先构建 miniapp）
cd ../miniapp
npm install
npm run build:h5

# 回到 app 目录同步
cd ../app
npx cap sync
```

**步骤 2：检查 Android 定位权限**

打开文件：`app/android/app/src/main/AndroidManifest.xml`

确保有这些权限：

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

**步骤 3：构建 APK**

```bash
cd app/android
./gradlew assembleDebug
```

APK 位置：`app/android/app/build/outputs/apk/debug/app-debug.apk`

---

### 方案二：更新 GitHub Actions（自动构建）

让我给你一个更完善的 workflow！

---

## iOS 完整发布流程

### ⚠️ iOS 发布必备条件

| 项目 | 说明 |
|-----|------|
| ✅ **Apple Developer 账号** | 99 美元/年 |
| ✅ **Mac 电脑** | 必须用 Xcode 打包 |
| ✅ **iPhone/iPad** | 用于测试 |
| ✅ **App 图标和截图** | App Store 需要 |

---

### 🚀 iOS 发布完整步骤（9步）

#### **第 1 步：Apple Developer 账号**

1. 访问：https://developer.apple.com/programs/
2. 注册开发者账号（99 美元/年）
3. 等待审核（通常1-3天）

#### **第 2 步：在 Mac 上本地构建 iOS App**

```bash
# 1. 进入 app 目录
cd app

# 2. 添加 iOS 平台
npx cap add ios

# 3. 确保 miniapp 已构建
cd ../miniapp
npm run build:h5

# 4. 同步到 iOS
cd ../app
npx cap sync

# 5. 打开 Xcode 项目
npx cap open ios
```

#### **第 3 步：配置 iOS 定位权限**

在 Xcode 中打开 `Info.plist`（通常在 `ios/App/App/Info.plist`），添加：

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>需要您的位置来查看附近的任务</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>需要您的位置来提供更好的服务</string>
```

#### **第 4 步：在 Xcode 中配置签名**

1. 打开 Xcode 项目（`npx cap open ios`）
2. 选择左侧项目导航器中的 App 项目
3. 选择 **Signing & Capabilities** 标签
4. 选择你的 **Team**（Apple Developer 账号）
5. 确保 Bundle Identifier 是唯一的（`com.campus.helper` 或类似）

#### **第 5 步：在真机上测试**

1. 用数据线连接 iPhone 到 Mac
2. 在 Xcode 顶部选择你的 iPhone 作为目标设备
3. 点击 ▶️ 按钮运行 App
4. 在手机上点击"信任"并授予权限

#### **第 6 步：准备 App Store Connect**

1. 访问：https://appstoreconnect.apple.com/
2. 登录你的 Apple Developer 账号
3. 点击 **My Apps** → **+** → **New App**
4. 填写信息：
   - Name：Campus Helper（或你的 App 名称）
   - Language：Chinese (Simplified)
   - Bundle ID：选择你在 Xcode 中的 Bundle ID
   - SKU：可以是 com.campus.helper.202404
5. 点击 **Create**

#### **第 7 步：准备 App Store 素材**

需要准备：

| 素材 | 规格 | 数量 |
|------|------|------|
| 截图 | 1284x2778（iPhone 14 Pro Max） | 至少 3 张 |
| 图标 | 1024x1024 | 1 张 |
| 描述 | 中文描述 | 一段 |
| 关键词 | 校园、互助、任务 | 几个词 |
| 年龄分级 | 4+ | - |

#### **第 8 步：Archive 并上传到 App Store Connect**

1. 在 Xcode 中，选择顶部菜单 **Product** → **Archive**
2. 等待 Archive 完成
3. 在 **Organizer** 窗口中，点击 **Distribute App**
4. 选择 **App Store Connect** → **Next**
5. 选择 **Automatically manage signing** → **Next**
6. 点击 **Upload** → 等待上传完成

#### **第 9 步：在 App Store Connect 中提交审核**

1. 回到 https://appstoreconnect.apple.com/
2. 进入你的 App
3. 点击 **TestFlight** 可以先做内部测试（可选）
4. 点击 **Prepare for Submission** 准备正式提交
5. 填写所有信息：
   - App 截图
   - 描述
   - 关键词
   - 年龄分级
6. 点击 **Submit for Review**
7. 等待 Apple 审核（通常 1-3 天）

---

## 本地测试流程

### Android 本地测试

```bash
# 1. 构建 miniapp
cd miniapp
npm install
npm run build:h5

# 2. 同步到 app
cd ../app
npx cap sync

# 3. 打开 Android Studio
npx cap open android

# 4. 在 Android Studio 中点击 ▶️ 运行
```

### iOS 本地测试（需要 Mac）

```bash
# 1. 构建 miniapp
cd miniapp
npm install
npm run build:h5

# 2. 同步到 app
cd ../app
npx cap sync

# 3. 打开 Xcode
npx cap open ios

# 4. 在 Xcode 中选择 iPhone 设备，点击 ▶️ 运行
```

---

## 📝 重要提示

### Android 定位注意事项

1. **权限声明**：AndroidManifest.xml 必须有定位权限
2. **Capacitor 插件**：确保 `@capacitor/geolocation` 已安装
3. **位置模式**：手机要打开 GPS，设为"高精度"

### iOS 注意事项

1. **必须用 Mac**：不能在 Windows/Linux 上打包 iOS
2. **必须付费**：Apple Developer 账号 99 美元/年
3. **测试设备**：最好有真机，模拟器无法测试真实 GPS

---

## 🔗 相关链接

- Apple Developer：https://developer.apple.com/programs/
- App Store Connect：https://appstoreconnect.apple.com/
- Capacitor 文档：https://capacitorjs.com/docs

---

## 💡 快速问答

### Q: 可以在 Windows 上打包 iOS 吗？
A: ❌ 不行，必须用 Mac！可以租 Mac 云服务器或买一台便宜的 Mac Mini。

### Q: Android 定位权限在哪里配置？
A: `app/android/app/src/main/AndroidManifest.xml`

### Q: 我没有 Apple Developer 账号，可以测试吗？
A: 可以！用 Xcode 直接安装到自己的 iPhone 上就行，不需要账号（但有7天限制）。

---

## 🎉 下一步

1. **先修复 Android 定位问题**：尝试本地完整构建一次
2. **再尝试 iOS**：如果你有 Mac 的话
3. **最后发布到商店**：等测试都没问题后

有问题随时问我！
