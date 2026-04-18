# App 定位配置指南

## 目录
1. [优化内容概述](#优化内容概述)
2. [Android 打包流程](#android-打包流程)
3. [iOS 打包流程](#ios-打包流程)
4. [测试要点](#测试要点)
5. [常见问题](#常见问题)

---

## 优化内容概述

### 1. 代码层面优化 (`miniapp/src/utils/location.ts`)

✅ **环境检测更准确**
- 增加了 `__capacitor__` 和 meta 标签检测
- 插件检测兼容多个可能的名称

✅ **Capacitor 定位流程优化**
- 先请求权限，再进行定位
- 高精度 → 低精度 → 浏览器 → 缓存 → 默认值
- 增加了完整的日志输出

✅ **超时时间调整**
- 高精度：20秒（给GPS足够时间）
- 低精度：10-12秒
- 浏览器超时也相应增加

✅ **错误处理和降级**
- 插件失败自动降级到浏览器定位
- 所有失败使用上次缓存位置
- 最后保底使用校园默认位置

### 2. 权限配置优化 (`app/scripts/setup-android-permissions.js`)

包含以下权限：
- `INTERNET` - 网络访问
- `ACCESS_NETWORK_STATE` - 网络状态
- `ACCESS_COARSE_LOCATION` - 粗略定位
- `ACCESS_FINE_LOCATION` - 精确定位

---

## Android 打包流程

### 方式一：本地打包（推荐用于测试）

1. **构建 H5**
   ```bash
   cd miniapp
   npm run build:h5
   ```

2. **配置 Capacitor**
   ```bash
   cd ../app
   npm install
   
   # 如果是第一次，添加平台
   npx cap add android
   
   # 同步 H5 代码
   npx cap sync
   
   # 配置权限
   node scripts/setup-android-permissions.js
   
   # 打开 Android Studio
   npx cap open android
   ```

3. **在 Android Studio 中打包**
   - 打开项目后等待 Gradle 同步
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - 找到 APK：`app/android/app/build/outputs/apk/debug/app-debug.apk`

### 方式二：GitHub Actions 自动打包

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "更新定位功能"
   git push
   ```

2. **手动触发构建**
   - 打开仓库 → Actions → Build Android APK
   - 点击右侧 "Run workflow" → 选择分支 → 确认

3. **下载 APK**
   - 构建完成后，在 Summary 页面底部下载 `app-debug`

---

## iOS 打包流程

### 前置要求

✅ **必须有**：
- 一台 Mac 电脑
- Apple Developer 账号（99美元/年）
- 测试用 iPhone（可选但推荐）

### 打包步骤

1. **构建 H5**
   ```bash
   cd miniapp
   npm run build:h5
   ```

2. **配置 iOS 平台**
   ```bash
   cd ../app
   npx cap add ios
   npx cap sync
   npx cap open ios
   ```

3. **在 Xcode 中配置**
   - 打开项目
   - 选择 Signing & Capabilities → 选择你的 Team
   - 配置 Bundle Identifier（例如：`com.campus.helper`）
   - 连接你的 iPhone（如果要真机测试）

4. **权限配置 (Info.plist)**
   确保包含以下内容：
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>需要您的位置来查看附近任务</string>
   <key>NSLocationAlwaysUsageDescription</key>
   <string>需要您的位置以获取更好的体验</string>
   ```

5. **打包和发布**
   - Product → Archive
   - 完成后在 Organizer 中点击 Distribute App
   - 选择 App Store Connect → 上传
   - 前往 App Store Connect 提交审核

---

## 测试要点

### Android 测试清单

1. **首次安装**
   - 打开 App → 授予位置权限
   - 检查是否弹出权限对话框

2. **定位功能**
   - 走到户外，测试 GPS 定位（高精度）
   - 在室内，测试网络定位（低精度）
   - 查看控制台日志，确认使用的定位方式

3. **地图选点**
   - 发布任务 → 地图选点
   - 选择位置 → 确认位置是否正确保存

4. **任务列表**
   - 确认任务是否按距离排序

### iOS 测试清单

1. **权限测试**
   - 首次打开，检查定位权限对话框
   - 设置 → 隐私 → 定位服务，确认权限状态

2. **不同场景**
   - WiFi 环境测试
   - 4G/5G 环境测试
   - GPS 信号好的户外测试

3. **后台定位（如需要）**
   - 测试 App 在后台时的定位情况

---

## 常见问题

### Q: 安装 APK 后定位失败？

A: 检查以下几点：
1. 确认手机开启了定位服务
2. 确认授予了 App 定位权限
3. 查看手机设置 → 应用 → Campus Helper → 权限
4. 尝试到户外，确认 GPS 信号

### Q: 定位精度很差？

A: 
- 高精度模式需要 GPS，在户外效果更好
- 室内通常使用网络定位，精度较低（几十米到几百米）
- 可以在地图选点中手动点击纠正

### Q: 打包的 APK 没有定位权限？

A: 
- 确保运行了 `setup-android-permissions.js`
- 或者手动编辑 `app/android/app/src/main/AndroidManifest.xml`
- 确认包含以下内容：
  ```xml
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  ```

### Q: iOS 提交审核被拒？

A: 
- 检查 Info.plist 的定位使用描述是否清晰
- 确保描述解释了为什么需要定位（例如："帮助查看附近的任务"）
- 不要使用空描述或模糊描述

### Q: 浏览器有定位，App 没有？

A: 
- App 使用 Capacitor 插件，浏览器使用 Web API
- 两者流程独立，检查插件是否正确安装
- 查看 `@capacitor/geolocation` 是否已安装

---

## 快速检查清单

打包前确认：

- [ ] `miniapp/src/utils/location.ts` 已更新
- [ ] 运行 `npm run build:h5` 成功
- [ ] `app/scripts/setup-android-permissions.js` 已准备
- [ ] GitHub Actions workflow 正确配置
- [ ] 代码已推送到 GitHub

测试时确认：

- [ ] App 启动正常
- [ ] 定位权限请求正常弹出
- [ ] 在户外能获取到高精度位置
- [ ] 地图上能看到自己的位置
- [ ] 发布任务时地图选点功能正常
- [ ] 确认按钮能正确保存位置

---

## 获取帮助

如果还有问题：
1. 查看控制台日志（`[location]` 开头的输出）
2. 检查手机设置中的权限配置
3. 尝试在不同环境（室内/室外、WiFi/4G）测试
4. 查看 `APP_BUILD_AND_RELEASE_GUIDE.md` 了解更多

祝你打包顺利！🚀
