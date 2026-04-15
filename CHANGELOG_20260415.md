# 2026-04-15 开发日志

## 今日完成的工作

### 1. Android App 打包配置

- **配置 Capacitor 框架** - 用于将 H5 网站打包成原生 Android App
  - 创建了 `app/` 目录
  - 添加了 `capacitor.config.ts` 配置文件
  - 添加了 `app/package.json` 依赖管理
  - 创建了 `app/www/` 本地资源目录
  - 添加了 Fallback 加载页面 `app/www/index.html`

- **配置 GitHub Actions 自动构建**
  - 创建了 `.github/workflows/build-android.yml`
  - 配置了自动构建 Android APK 的工作流
  - 支持 Secrets 配置（Supabase URL、Anon Key、高德地图密钥等）
  - 构建完成后自动上传 APK 作为 Artifacts

- **创建使用文档**
  - `app/README.md` - App 打包使用说明
  - `app/GITHUB_ACTIONS_GUIDE.md` - GitHub Actions 详细指南
  - `app/build-local.bat` - Windows 本地构建辅助脚本

### 2. App 定位问题修复

- **添加 WGS84 到 GCJ02 坐标转换**
  - 在 `miniapp/src/utils/location.ts` 中添加了坐标转换函数
  - 修复了 H5/App 定位偏移问题
  - 浏览器返回的 WGS84 坐标自动转换为高德地图使用的 GCJ02 坐标

- **添加 Capacitor Geolocation 插件支持**
  - 在 `app/package.json` 中添加了 `@capacitor/geolocation` 插件
  - 修改了 `miniapp/src/utils/location.ts` 支持插件定位
  - 添加了环境检测日志，方便调试

### 3. App Input 兼容性修复

- **修复手机端 Input 输入不稳定问题**
  - 所有 Input 组件同时支持 `onInput` 和 `onChange` 事件
  - 添加了空值安全检查 `e.detail?.value ?? e.target?.value ?? ''`
  - 添加了 console.log 调试日志，方便排查问题
  - 修改文件：
    - `miniapp/src/pages/login/index.tsx` - 登录/注册页面
    - `miniapp/src/pages/auth/verify.tsx` - 认证页面

### 4. 安全相关

- **清理 Git 历史中的敏感信息**
  - 使用 `git filter-repo` 工具清理了历史提交中的 API 密钥
  - 创建了全新的提交历史
  - 创建了本地密钥备份 `miniapp/KEYS_BACKUP.txt`
  - 创建了 `.env.example` 示例文件
  - 更新了 `.gitignore` 防止敏感文件被提交

### 5. 其他尝试

- **尝试 Cloudflare Workers 反向代理**
  - 配置了 Cloudflare Worker 作为 Supabase 反向代理
  - 测试后发现国内访问速度仍不理想
  - 最终回退到直接连接 Supabase 的方案

## 已知问题

1. **国内网络访问 Supabase 不稳定**
   - Supabase 是国外服务，国内访问需要 VPN
   - 建议长期方案：迁移到国内云开发平台（微信云开发、阿里云等）

2. **App 定位在部分设备上可能需要权限**
   - 已添加 Capacitor Geolocation 插件支持
   - 建议在真机上测试定位权限

## 下一步计划

- 考虑迁移到国内云开发平台
- 测试 App 在不同设备上的兼容性
- 优化 App 启动速度和用户体验

---

## 测试账号

### 测试手机号
- 手机号：`13800138000` ~ `13800138009`
- 验证码：`123456`

### 测试邮箱
- `test@campus.edu`
- `user@campus.edu`
- `demo@campus.edu`
- 密码：`dev_{邮箱前缀}`（例如：dev_test）

---

**文档创建时间：2026-04-15**
