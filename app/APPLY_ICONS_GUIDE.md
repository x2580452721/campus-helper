# 🎓 Campus Helper 图标应用指南

## ✅ 你已经下载图标了！

### 📋 下一步该怎么做？

---

## 🚀 方法1：使用现有的 android-icons（最快！）⭐

好消息！`android-icons` 文件夹里已经有准备好的图标了！

### 步骤：

1. **初始化Android项目**（如果还没有）:
   ```bash
   cd app
   npx cap add android
   ```

2. **复制图标到Android项目**:
   ```bash
   # 在PowerShell中运行
   Copy-Item -Path "android-icons\mipmap-*\ic_launcher*.png" -Destination "android\app\src\main\res\" -Recurse
   ```

3. **重新构建应用**:
   ```bash
   npm run build:android
   ```

---

## 📦 方法2：使用你刚刚下载的图标

1. **找到下载的图标** - 通常在你的 `Downloads` 文件夹
2. **重命名并整理**（如果需要）:
   - `ic_launcher-1024.png` → `ic_launcher.png` (放在项目根目录)
   - `ic_launcher-192.png` → 放在 `android/app/src/main/res/mipmap-xxxhdpi/`
   - `ic_launcher-144.png` → 放在 `android/app/src/main/res/mipmap-xxhdpi/`
   - `ic_launcher-96.png` → 放在 `android/app/src/main/res/mipmap-xhdpi/`
   - `ic_launcher-72.png` → 放在 `android/app/src/main/res/mipmap-hdpi/`
   - `ic_launcher-48.png` → 放在 `android/app/src/main/res/mipmap-mdpi/`

---

## 🔧 方法3：使用 Capacitor Assets（最专业！）

1. **确保你有1024x1024的图标**:
   - 从 `icon-generator.html` 下载 1024x1024
   - 保存为 `app/icon.png`

2. **安装工具**:
   ```bash
   cd app
   npm install @capacitor/assets --save-dev
   ```

3. **生成所有图标**:
   ```bash
   npx capacitor-assets generate --android
   ```

4. **完成！** 工具会自动生成所有尺寸并放到正确的位置

---

## 📁 当前项目结构

```
app/
├── android-icons/          ✅ 已准备好的图标！
│   ├── mipmap-mdpi/
│   ├── mipmap-hdpi/
│   ├── mipmap-xhdpi/
│   ├── mipmap-xxhdpi/
│   ├── mipmap-xxxhdpi/
│   ├── icon-512/
│   └── icon-1024/
├── assets/
├── icon-generator.html    🎨 可以再次下载图标
└── ...
```

---

## 🎯 快速开始（推荐！）

你想现在就试试吗？按照以下步骤：

### 1. 首先构建Web应用:
```bash
cd miniapp
npm run build:h5
```

### 2. 然后初始化Android:
```bash
cd ../app
npx cap add android    # 如果还没有Android项目
npx cap sync          # 同步Web内容
```

### 3. 复制图标:
```bash
# 使用PowerShell复制
Copy-Item -Path "android-icons\mipmap-*" -Destination "android\app\src\main\res\" -Recurse
```

### 4. 打开Android Studio:
```bash
npx cap open android
```

然后在Android Studio中运行应用！

---

## 💡 提示

- **`android-icons`** 文件夹已经有图标了，可以直接用！
- 如果用Capacitor Assets，只需要 `icon.png` (1024x1024)
- 构建Android应用前，先确保Web应用构建成功！

---

## 🎉 完成！

你的应用现在将拥有精美设计的图标！

图标设计：**设计A - 简约渐变**
- 青色-蓝色-绿色渐变
- 与开屏动画完美搭配！
