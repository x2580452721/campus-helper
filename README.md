---
## 📌 [给 AI 助手的提示](.trae-ai-prompt.md) - **请先看这里！**

### 文档位置与工作流程
1. **只修改 `docs/` 目录下的文档！**
2. 修改后运行：`python sync_docs_simple.py` 同步到 `.trae/documents/`
3. 详细说明见：[文档同步指南](docs/01-项目管理/DOCS_SYNC_GUIDE.md)

---
# Campus Helper - 校园互助平台

基于 **Taro (MiniApp)** + **React (Admin)** + **Supabase** 的全栈校园互助解决方案。

## 📚 文档导航

### 项目管理
*   **[需求与Bug跟踪](docs/01-项目管理/requirements_and_bugs.md)**
*   **[项目路线图](docs/01-项目管理/project_roadmap.md)**
*   **[项目开发历程](docs/01-项目管理/项目开发历程.md)**
*   **[会议记录 2026-04-14](docs/01-项目管理/meeting_minutes_20260414.md)**
*   **[文档同步指南](docs/01-项目管理/DOCS_SYNC_GUIDE.md)**

### 产品文档
*   **[产品需求文档 (PRD)](docs/02-产品文档/campus_helper_prd.md)**
*   **[软件需求规格 (SRS)](docs/02-产品文档/campus_helper_srs.md)**
*   **[产品介绍](docs/02-产品文档/产品介绍.md)**
*   **[项目架构说明](docs/02-产品文档/项目架构说明.md)**

### 技术文档
*   **[快速开始 (QUICKSTART)](docs/03-技术文档/QUICKSTART.md)**
*   **[部署指南 (DEPLOYMENT)](docs/03-技术文档/DEPLOYMENT.md)** - **必读！**
*   **[Supabase 设置指南](docs/03-技术文档/SUPABASE_SETUP_GUIDE.md)**
*   **[技术架构文档](docs/03-技术文档/campus_helper_technical_architecture.md)**
*   **[App 定位配置指南](docs/03-技术文档/APP_LOCATION_GUIDE.md)**

### 用户文档
*   **[用户手册 (USER MANUAL)](docs/04-用户文档/USER_MANUAL.md)**
*   **[测试账号文档](docs/04-用户文档/test-accounts.md)**

### 测试文档
*   **[测试计划](docs/05-测试文档/test_plan.md)**

## ✨ 核心特性

*   **双端互通**: 小程序端用户交互 + Web 端后台管理。
*   **纯净认证**: 强制学号实名认证，保障校园安全。
*   **LBS 调度**: 基于高德地图的实时任务匹配。
*   **三态引擎**: 独创 Off/Active/Standby 状态切换，平衡接单与生活。
*   **信用体系**: 完整的信用分奖惩机制，支持管理员手动干预。

## 🚀 快速开始

### 1. 初始化依赖
```bash
cd miniapp && npm install
```

### 2. 启动服务
*   **小程序 H5 预览**:
    ```bash
    cd miniapp
    npm run dev:h5
    ```
*   **Android App 打包**:
    - 详细说明请查看 [app/README.md](./app/README.md)
    - 或使用 GitHub Actions 自动构建（详见 [app/GITHUB_ACTIONS_GUIDE.md](./app/GITHUB_ACTIONS_GUIDE.md)）
    - 定位配置详见 [docs/03-技术文档/APP_LOCATION_GUIDE.md](docs/03-技术文档/APP_LOCATION_GUIDE.md)

## 📁 项目结构

```
Campus Helper/
├── docs/                          # 📚 文档主目录
│   ├── 01-项目管理/               # 项目管理文档
│   ├── 02-产品文档/               # 产品相关文档
│   ├── 03-技术文档/               # 技术实现文档
│   ├── 04-用户文档/               # 用户使用说明
│   └── 05-测试文档/               # 测试相关文档
├── miniapp/                       # 📱 小程序前端
├── app/                           # 📦 App 打包 (Capacitor)
├── sync_docs_simple.py            # 🔄 文档同步脚本
└── README.md                      # 👈 你在这里
```

## 📌 重要说明

- **请只编辑 `docs/` 下的文档！**
- 修改后运行 `python sync_docs_simple.py` 同步到 `.trae/documents/`
- 详见 [文档同步指南](docs/01-项目管理/DOCS_SYNC_GUIDE.md)

## 🛠️ 技术栈

*   **前端**: Taro, React, TypeScript, NutUI, Ant Design
*   **移动端**: Capacitor (Android App 打包)
*   **后端**: Supabase (PostgreSQL, Auth, RLS)
*   **工具**: Vite, PostCSS, GitHub Actions

---
Created with ❤️ by Trae AI
