# Campus Helper - 校园互助平台

基于 **Taro (MiniApp)** + **React (Admin)** + **Supabase** 的全栈校园互助解决方案。

## 📚 文档导航

*   **[产品需求文档 (PRD)](.trae/documents/campus_helper_prd.md)**: 详细的功能定义与业务流程。
*   **[技术架构文档](.trae/documents/campus_helper_technical_architecture.md)**: 系统架构设计与技术选型。
*   **[部署指南 (Deployment)](.trae/documents/DEPLOYMENT.md)**: **必读！** 环境搭建与发布教程。
*   **[用户手册 (User Manual)](.trae/documents/USER_MANUAL.md)**: 管理员与用户操作说明。
*   **[测试账号文档](docs/test-accounts.md)**: 开发测试用的账号和数据。

## ✨ 核心特性

*   **双端互通**: 小程序端用户交互 + Web 端后台管理。
*   **纯净认证**: 强制学号实名认证，保障校园安全。
*   **LBS 调度**: 基于高德地图的实时任务匹配。
*   **三态引擎**: 独创 Off/Active/Standby 状态切换，平衡接单与生活。
*   **信用体系**: 完整的信用分奖惩机制，支持管理员手动干预。

## 🚀 快速开始

### 1. 初始化依赖
```bash
npm install
cd miniapp && npm install
cd ../admin && npm install
```

### 2. 启动服务
*   **小程序 H5 预览**:
    ```bash
    cd miniapp
    npm run dev:h5
    ```
*   **管理后台**:
    ```bash
    cd admin
    npm run dev
    ```

## 🛠️ 技术栈

*   **前端**: Taro, React, TypeScript, NutUI, Ant Design
*   **后端**: Supabase (PostgreSQL, Auth, RLS)
*   **工具**: Vite, PostCSS

---
Created with ❤️ by Trae AI
