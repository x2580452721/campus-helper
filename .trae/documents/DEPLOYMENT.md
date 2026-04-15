# 🚀 Campus Helper 部署指南 (Deployment Guide)

本文档旨在指导开发者从零开始搭建、配置并部署 **Campus Helper** 校园互助平台。

---

## 🛠️ 1. 环境准备 (Prerequisites)

在开始之前，请确保你的开发环境满足以下要求：

*   **Node.js**: v18.0.0 或更高版本
*   **包管理器**: npm 或 yarn
*   **开发工具**: VS Code, 微信开发者工具 (用于小程序预览)
*   **后端服务**: Supabase 账号

---

## ☁️ 2. 后端服务配置 (Supabase Setup)

本项目使用 **Supabase** 作为后端 BaaS 服务（数据库、认证、存储）。

### 2.1 创建项目
1.  登录 [Supabase Dashboard](https://supabase.com/dashboard)。
2.  点击 **"New Project"**，填写项目名称（如 `Campus Helper`）和数据库密码。
3.  等待项目初始化完成（约 1-2 分钟）。

### 2.2 数据库初始化
本项目提供了完整的 SQL 迁移脚本，可一键生成表结构和安全策略。

1.  在 Supabase 后台，进入 **SQL Editor**。
2.  依次复制并运行 `supabase/migrations` 目录下的 SQL 文件内容：
    *   `20260312000000_init_schema.sql` (基础表结构)
    *   `20260312000001_update_schema_v2.sql` (字段补充)
    *   `20260312000002_admin_policies.sql` (管理员权限)
    *   `20260312000003_system_config.sql` (系统配置表)

### 2.3 获取 API 密钥
1.  进入 **Project Settings -> API**。
2.  复制 `Project URL` 和 `anon public` Key。
3.  你需要将这些信息填入前端项目的 `.env` 文件中。

---

## 📱 3. 小程序端部署 (MiniApp Deployment)

小程序端基于 **Taro + React** 开发。

### 3.1 安装依赖
```bash
cd miniapp
npm install
```

### 3.2 环境变量配置
复制 `.env.example` 为 `.env`（如果不存在则手动创建），并填入 Supabase 信息：
```ini
TARO_APP_SUPABASE_URL=你的_Project_URL
TARO_APP_SUPABASE_ANON_KEY=你的_Anon_Key
TARO_APP_AMAP_KEY=你的高德地图小程序Key
```

### 3.3 本地开发
*   **微信小程序预览**：
    ```bash
    npm run dev:weapp
    ```
    运行后，打开 **微信开发者工具**，导入 `miniapp` 目录即可预览。

*   **H5 预览**：
    ```bash
    npm run dev:h5
    ```
    访问 `http://localhost:10089`。

### 3.4 生产构建
```bash
npm run build:weapp
```
构建产物位于 `miniapp/dist` 目录，可在微信开发者工具中点击“上传”发布体验版。

---

## 🖥️ 4. 管理后台部署 (Admin Deployment)

管理后台基于 **React + Vite + Ant Design** 开发。

### 4.1 安装依赖
```bash
cd admin
npm install
```

### 4.2 环境变量配置
在 `admin` 目录下创建 `.env` 文件：
```ini
VITE_SUPABASE_URL=你的_Project_URL
VITE_SUPABASE_ANON_KEY=你的_Anon_Key
```

### 4.3 本地开发
```bash
npm run dev
```
访问 `http://localhost:5173`。

### 4.4 生产构建与部署
```bash
npm run build
```
构建产物位于 `admin/dist` 目录。你可以将其部署到任何静态网站托管服务，如：
*   **Vercel** (推荐)
*   **Netlify**
*   **Nginx** 服务器

---

## 🔐 5. 管理员账号初始化

为了登录管理后台，你需要创建一个管理员账号。

1.  进入项目根目录。
2.  运行初始化脚本：
    ```bash
    npm install # 确保根目录有依赖 (可选)
    cd scripts
    npm install # 安装脚本依赖
    node create_admin.js
    ```
3.  脚本将自动创建账号：
    *   **邮箱**: `admin@campus.com`
    *   **密码**: `admin123`

---

## ⚠️ 常见问题 (FAQ)

*   **Q: 小程序 H5 预览白屏？**
    *   A: 请确保 `miniapp/src/index.html` 存在，且配置了正确的入口脚本。推荐使用微信开发者工具进行原生预览。
*   **Q: 数据库权限报错？**
    *   A: 请检查是否遗漏了 `20260312000002_admin_policies.sql` 脚本，该脚本赋予了管理员修改数据的权限。
