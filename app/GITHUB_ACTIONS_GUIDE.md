# GitHub Actions 自动构建 APK 指南

这个方案可以让 GitHub 自动帮你构建可分享的 Android APK 文件！

---

## 📋 前置要求

1. 一个 GitHub 账号
2. 你的代码已经推送到 GitHub 仓库

---

## 🚀 快速开始（3 步搞定）

### 第 1 步：把代码推送到 GitHub

如果你还没有推送代码到 GitHub：

```bash
# 初始化 git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送
git push -u origin main
```

### 第 2 步：在 GitHub 上触发构建

推送代码后，GitHub 会自动检测到 `.github/workflows/build-android.yml` 文件并开始构建。

你也可以**手动触发**：
1. 打开你的 GitHub 仓库
2. 点击顶部的 **Actions** 标签
3. 点击左侧的 **Build Android APK**
4. 点击右侧的 **Run workflow** 按钮
5. 选择分支（main/master），点击绿色的 **Run workflow**

### 第 3 步：下载 APK

构建完成后（通常需要 3-5 分钟）：

1. 在 Actions 页面点击刚刚完成的工作流
2. 滚动到页面底部的 **Artifacts** 区域
3. 你会看到两个文件：
   - `app-debug` - Debug 版本（可以直接安装，推荐测试用）
   - `app-release-unsigned` - Release 版本（未签名，需要签名后才能发布）
4. 点击下载，解压后得到 `.apk` 文件

---

## 📱 安装 APK 到手机

下载到 `app-debug.apk` 后：

1. 把 APK 文件传到手机（通过微信、QQ、数据线等）
2. 在手机上点击 APK 文件
3. 允许安装未知来源应用
4. 点击安装

---

## 📁 文件说明

```
.github/
└── workflows/
    └── build-android.yml    # GitHub Actions 工作流配置

app/
├── build-local.bat          # Windows 本地构建辅助脚本
└── GITHUB_ACTIONS_GUIDE.md # 本说明文档
```

---

## 🔧 常见问题

### Q: 构建失败怎么办？

A: 点击 Actions 中失败的工作流，查看日志输出，根据错误信息排查问题。

### Q: Debug 版本和 Release 版本有什么区别？

| 版本 | 是否需要签名 | 能否直接安装 | 适用场景 |
|-----|-----------|-----------|--------|
| Debug | ❌ 不需要 | ✅ 可以直接安装 | 测试、分享给朋友 |
| Release | ✅ 需要签名 | ❌ 需签名后安装 | 正式发布到应用商店 |

### Q: 我想给 Release 版本签名怎么办？

A: 签名比较复杂，对于分享给朋友用，**Debug 版本完全够用**！

### Q: 可以修改 App 名称和图标吗？

A: 可以！修改 `app/capacitor.config.ts` 中的 `appName`，然后重新推送代码。

---

## 💡 提示

- Debug APK 虽然叫"调试版"，但功能和正式版完全一样，只是不能发布到应用商店
- 每次你推送代码到 GitHub，都会自动构建新的 APK
- 你也可以在 Actions 页面手动触发构建，不需要推送代码

---

## 🎉 完成！

现在你可以：
1. 推送代码到 GitHub
2. 等待 3-5 分钟
3. 下载 APK
4. 分享给朋友安装！

有问题随时问我~
