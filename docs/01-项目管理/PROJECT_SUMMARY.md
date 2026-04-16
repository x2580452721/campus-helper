# Campus Helper - 校园互助平台项目总结

## 📋 文档信息

| 项目 | 内容 |
|-----|-----|
| **项目名称** | Campus Helper - 校园互助平台 |
| **创建日期** | 2026-03-26 |
| **版本** | v2.0 |
| **状态** | 开发中 |

---

## 🎯 项目概述

Campus Helper 是一个基于 Taro + React + Supabase 的全栈校园互助解决方案，旨在为在校学生提供一个安全、便捷的任务互助平台。

### 核心特性

- ✅ **四端架构**：管理后台 Web + 小程序 H5 端 + 微信小程序端 + 独立地图 Web 服务
- ✅ **纯净认证**：强制学号实名认证，保障校园安全
- ✅ **LBS 调度**：基于高德地图的实时任务匹配
- ✅ **三态引擎**：独创 Off/Active/Standby 状态切换，平衡接单与生活
- ✅ **信用体系**：完整的信用分奖惩机制，支持管理员手动干预

---

## 🏗️ 技术架构（四部分）

### 1. 管理后台 (admin/)

**技术栈**：React 18 + TypeScript + Ant Design + Vite

**功能**：
- 用户管理
- 任务审核与管理
- 校园地点管理
- 区域划分管理
- 系统配置
- 数据统计仪表盘

**启动方式**：
```bash
cd admin
npm install
npm run dev
```

**访问地址**：http://localhost:5173

---

### 2. 小程序 H5 端 (miniapp/ - dev:h5)

**技术栈**：Taro 3.6.23 + React 18 + TypeScript + NutUI

**功能**：
- 完整的用户功能
- 原生地图组件 (AmapView)
- 任务浏览、发布、接单
- 个人中心

**启动方式**：
```bash
cd miniapp
npm install
npm run dev:h5
```

**访问地址**：http://localhost:10086

---

### 3. 微信小程序端 (miniapp/ - dev:weapp / build:weapp)

**技术栈**：Taro 3.6.23 + React 18 + TypeScript + NutUI + 微信小程序原生 API

**功能**：
- 完整的用户功能
- WebView 内嵌独立地图网页
- 任务浏览、发布、接单
- 个人中心

**关键特性**：
- 地图功能完全由独立 Web 服务提供
- 通过 web-view 组件加载 Vercel 部署的地图页面
- 地图页面完全覆盖微信小程序地图页面
- 小程序端仅提供 web-view 容器和通信桥梁

**启动方式**：
```bash
cd miniapp
npm install
npm run dev:weapp      # 开发模式
npm run build:weapp    # 生产构建
```

**使用工具**：微信开发者工具，导入 miniapp 目录（project.config.json 已配置 miniprogramRoot 为 ./weapp-dist/）

---

### 4. 独立地图 Web 服务 (miniapp/src/static/amap-h5.html + Vercel 部署)

**技术栈**：纯 HTML + JavaScript + 高德地图 JS API

**功能**：
- 地图展示与交互
- 任务标记点
- 地图选点
- 路线规划
- 定位功能
- 返回、导航等按钮（完全由 Web 页面提供）

**部署**：
- 源文件：miniapp/src/static/amap-h5.html
- 部署平台：Vercel
- 配置：miniapp/.env 中的 TARO_APP_MAP_WEBVIEW_URL
- 关键：必须配置微信小程序业务域名

**通信方式**：
- 小程序 → WebView：通过 URL 参数传递数据
- WebView → 小程序：通过 postMessage 发送消息

---

### 技术栈总览

| 层级 | 技术选型 |
|-----|---------|
| **管理后台** | React 18 + TypeScript + Ant Design + Vite |
| **小程序 H5 端** | Taro 3.6.23 + React 18 + TypeScript + NutUI |
| **微信小程序端** | Taro 3.6.23 + React 18 + TypeScript + NutUI + 微信小程序 API |
| **独立地图 Web 服务** | 纯 HTML + JavaScript + 高德地图 JS API |
| **后端服务** | Supabase (BaaS) |
| **数据库** | PostgreSQL |
| **地图服务** | 高德地图 API (JS API / Web 服务 API) |
| **状态管理** | React Context + useReducer |

### 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Campus Helper 系统                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│  │   管理后台 (Web)     │    │  小程序 H5 端 (Web)  │    │  微信小程序端     │
│  │   React + AntD       │    │   Taro + NutUI       │    │  Taro + NutUI    │
│  └──────────┬───────────┘    └──────────┬───────────┘    └────────┬─────────┘
│             │                             │                            │
│             └────────────────┬────────────┘                            │
│                              │                                         │
│                              ▼                                         ▼
│                  ┌─────────────────────┐                   ┌──────────────────────┐
│                  │   Supabase BaaS     │                   │  独立地图 Web 服务   │
│                  │  ┌───────────────┐  │                   │   (Vercel 部署)      │
│                  │  │ PostgreSQL DB │  │                   │  amap-h5.html        │
│                  │  │ Authentication│  │◀────postMessage───▶│  高德地图 JS API     │
│                  │  │ Storage Bucket│  │                   │  地图交互、选点      │
│                  │  │ Edge Functions│  │                   └──────────────────────┘
│                  │  └───────────────┘  │
│                  └─────────────────────┘
│                              │
│                              ▼
│                  ┌─────────────────────┐
│                  │   高德地图 API      │
│                  └─────────────────────┘
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
Campus Helper/
├── .trae/
│   └── documents/              # 项目文档
│       ├── campus_helper_prd.md          # 产品需求文档
│       ├── campus_helper_srs.md          # 需求规格说明
│       ├── campus_helper_technical_architecture.md  # 技术架构文档
│       ├── DEPLOYMENT.md                # 部署指南
│       ├── USER_MANUAL.md              # 用户手册
│       └── ...
├── admin/                      # 管理后台
│   ├── src/
│   │   ├── components/         # 组件
│   │   ├── pages/             # 页面
│   │   └── utils/             # 工具函数
│   └── package.json
├── miniapp/                    # 小程序端（H5 + 微信小程序）
│   ├── config/                # Taro 配置
│   ├── src/
│   │   ├── components/        # 组件
│   │   │   ├── AmapView/      # 地图组件 (H5 用)
│   │   │   ├── WebviewAmapView/ # WebView 地图容器 (微信小程序用)
│   │   │   └── WechatMapView/ # 微信原生地图（备用）
│   │   ├── pages/            # 页面
│   │   │   ├── index/        # 首页
│   │   │   ├── login/        # 登录
│   │   │   ├── auth/verify/  # 实名认证
│   │   │   ├── map/          # 地图页面（微信小程序端已简化，仅含 web-view）
│   │   │   ├── task/         # 任务相关
│   │   │   ├── my-tasks/     # 我的任务
│   │   │   └── profile/      # 个人中心
│   │   ├── static/           # 静态资源
│   │   │   └── amap-h5.html # 独立地图 Web 页面（核心！）
│   │   └── utils/            # 工具函数
│   ├── dist/                 # 编译输出 (gitignore)
│   ├── weapp-dist/           # 微信小程序编译输出
│   └── package.json
├── docs/                      # 其他文档
├── README.md
├── PROJECT_SUMMARY.md         # 本文档
├── SUPABASE_SETUP_GUIDE.md
├── MINIPROGRAM_DEPLOYMENT.md
└── QUICKSTART.md              # 快速开发指南
```

---

## 🗺️ 地图架构详细说明

### 微信小程序端地图实现（重点！）

**核心设计原则**：微信小程序端的地图功能完全由独立的 Web 服务提供，小程序端仅作为容器。

**为什么这样设计？**
1. 微信小程序原生地图功能受限
2. 高德地图在小程序中的 SDK 功能不完善
3. Web 端地图 API 更强大，交互更丰富
4. 统一一套地图代码，减少维护成本

**架构细节**：

```
微信小程序端 (miniapp/src/pages/map/index.tsx)
    │
    │  仅提供：
    │  - WebView 容器
    │  - 数据传递（通过 URL 参数）
    │  - 消息接收（通过 postMessage）
    │
    ▼
WebviewAmapView 组件 (miniapp/src/components/WebviewAmapView/index.tsx)
    │
    │  功能：
    │  - 构建 WebView URL（带参数）
    │  - 处理 postMessage 通信
    │  - 错误处理和降级
    │
    ▼
独立地图 Web 服务 (Vercel 上的 amap-h5.html)
    │
    │  功能（完整的地图功能都在这里！）：
    │  - 高德地图 JS API 初始化
    │  - 地图展示、缩放、平移
    │  - 任务标记点渲染
    │  - 地图选点功能
    │  - 路线规划
    │  - 定位功能
    │  - 返回按钮、定位按钮、导航按钮等 UI
    │  - 与小程序通信（postMessage）
    │
    ▼
高德地图 API 服务
```

**关键文件**：
- `miniapp/src/static/amap-h5.html` - 独立地图 Web 页面（核心！）
- `miniapp/src/components/WebviewAmapView/index.tsx` - WebView 容器组件
- `miniapp/src/pages/map/index.tsx` - 小程序地图页面（已简化）
- `miniapp/src/utils/amap.ts` - 地图相关工具函数和配置

**通信机制**：

1. **小程序 → WebView（URL 参数）**：
   - `lat` / `lng` - 用户位置
   - `markers` - 任务标记点数据（JSON 字符串）
   - `mode` - 模式（view/select）
   - `showRoute` - 是否显示路线
   - `dockMode` - 是否使用停靠模式
   - 等等...

2. **WebView → 小程序（postMessage）**：
   - `pageReady` / `mapReady` - 页面/地图就绪
   - `markerClick` - 标记点点击
   - `locationSelect` - 位置选择
   - `locationConfirm` - 位置确认
   - `locate` - 定位按钮点击
   - `back` - 返回按钮点击
   - `navigate` - 导航按钮点击
   - `openTaskDetail` - 打开任务详情
   - `mapError` - 地图错误

**微信小程序地图页面的简化**：
- 原来的小程序地图页面有自己的按钮（返回、定位等）
- 现在这些按钮完全由 Web 页面提供
- 小程序端只需要保留 web-view 容器
- ⚠️ **重要**：小程序端原来的按钮已经被 Web 页面覆盖，需要删除！

---

## ✨ 已完成功能

### 1. 高德地图 API Key 配置 ✅

**配置文件**：`miniapp/src/static/amap-h5.html`

已成功配置以下三个 Key：

| Key 类型 | 位置 | 值 |
|---------|------|-----|
| securityJsCode | 第 173 行 | `e09e5927e529fdbd75ec3975527e7d48` |
| JS API Key | 第 176 行 | `4afb64b64e61ef1dd7798ebca86053bf` |
| Web 服务 Key | 第 436 行 | `a29e6cc483fb0f868d7cddfd092e9800` |

### 2. 四端架构搭建 ✅

- 管理后台基础框架
- 小程序 H5 端基础框架
- 微信小程序端基础框架
- 独立地图 Web 服务

### 3. 独立地图 Web 服务 ✅

- `amap-h5.html` 完整功能
- 支持任务标记点
- 支持地图选点
- 支持路线规划
- 支持与小程序通信
- Vercel 部署配置

### 4. 小程序编译配置修复 ✅

**问题**：微信开发者工具找不到预打包文件

**修复内容**：
- 安装项目依赖：`npm install`
- 配置 `project.config.json`：`miniprogramRoot` 改为 `"./weapp-dist/"`
- 配置 `config/index.ts`：添加 `copy.patterns` 规则，确保 `amap-h5.html` 被正确复制
- 重新编译：`npm run build:weapp`

**修改文件列表**：
- `miniapp/project.config.json`
- `miniapp/config/index.ts`

---

## 🗂️ 数据库设计

（略，与旧版本相同）

---

## 📱 小程序端页面路由

| 路由 | 页面名称 | 功能描述 |
|-----|---------|---------|
| `/pages/index/index` | 首页 | 任务列表、地图视图、状态切换 |
| `/pages/login/index` | 登录页 | 用户登录 |
| `/pages/auth/verify` | 实名认证 | 学号认证 |
| `/pages/task/publish/index` | 发布任务 | 创建新任务 |
| `/pages/task/detail/index` | 任务详情 | 查看任务、接单 |
| `/pages/task/review/index` | 任务评价 | 完成评价 |
| `/pages/my-tasks/index` | 我的任务 | 管理发布和接单 |
| `/pages/profile/index` | 个人中心 | 用户信息、信用分 |
| `/pages/profile/edit` | 编辑资料 | 修改个人信息 |
| `/pages/map/index` | 地图页面 | **仅含 web-view，地图功能由独立 Web 服务提供** |

---

## 🖥️ 管理后台页面路由

（略，与旧版本相同）

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn
- 微信开发者工具（开发微信小程序时需要）
- Supabase 账号
- Vercel 账号（部署独立地图 Web 服务时需要）

### 管理后台开发

```bash
cd admin
npm install
npm run dev            # 开发模式
npm run build          # 生产构建
```

### 小程序 H5 端开发

```bash
cd miniapp
npm install
npm run dev:h5         # H5 开发
```

### 微信小程序端开发

```bash
cd miniapp
npm install
npm run dev:weapp      # 微信小程序开发
npm run build:weapp    # 微信小程序生产构建
```

然后在微信开发者工具中导入 miniapp 目录。

### 独立地图 Web 服务部署

1. 将 `miniapp/src/static/amap-h5.html` 部署到 Vercel
2. 在微信公众平台配置业务域名
3. 将部署后的 HTTPS 地址写入 `miniapp/.env` 的 `TARO_APP_MAP_WEBVIEW_URL`
4. 重新编译小程序

详见 [MINIPROGRAM_DEPLOYMENT.md](./MINIPROGRAM_DEPLOYMENT.md)

---

## ⚠️ 重要注意事项

### 1. 微信小程序端地图页面

**⚠️ 关键**：微信小程序端的地图页面（`miniapp/src/pages/map/index.tsx`）原来的按钮（返回、定位等）已经被 Web 页面覆盖，必须删除！

**当前状态**：这些按钮可能还留在上面，需要清理。

### 2. 独立地图 Web 服务

- 这是整个项目的核心组件之一
- 所有地图交互都在这里实现
- 必须部署到 HTTPS 域名
- 必须配置微信小程序业务域名

### 3. 环境变量配置

**miniapp/.env** 需要配置：
```env
TARO_APP_SUPABASE_URL=https://xxx.supabase.co
TARO_APP_SUPABASE_ANON_KEY=xxx
TARO_APP_MAP_WEBVIEW_URL=https://your-vercel-domain.vercel.app/static/amap-h5.html
```

**admin/.env** 需要配置：
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## 📋 后续建议工作

### 高优先级

1. **清理微信小程序地图页面**
   - 删除被 Web 页面覆盖的按钮（返回、定位等）
   - 简化页面结构，仅保留 web-view

2. **测试地图功能**
   - 测试 WebView 加载
   - 测试任务标记点
   - 测试地图选点
   - 测试 postMessage 通信

3. **完善用户认证流程**
   - 测试邮箱验证码登录
   - 完善学号认证功能
   - 添加用户信息编辑

4. **完善任务核心功能**
   - 测试任务发布流程
   - 测试接单/抢单功能
   - 实现任务状态流转

### 中优先级

5. **管理后台功能完善**
   - 任务审核功能
   - 用户管理功能
   - 数据统计仪表盘

6. **信用分系统**
   - 信用分奖惩逻辑
   - 信用分历史记录
   - 信用分影响因子

---

## 🔑 关键配置文件

| 文件路径 | 说明 |
|---------|------|
| `miniapp/src/static/amap-h5.html` | **核心！** 独立地图 Web 页面 |
| `miniapp/src/components/WebviewAmapView/index.tsx` | WebView 地图容器组件 |
| `miniapp/src/pages/map/index.tsx` | 小程序地图页面（需简化） |
| `miniapp/config/index.ts` | Taro 配置文件 |
| `miniapp/project.config.json` | 微信小程序项目配置 |
| `miniapp/.env` | 小程序环境变量 |
| `admin/.env` | 管理后台环境变量 |

---

## 📚 相关文档

- [快速开发指南](./QUICKSTART.md) - **必读！** 给 AI 开发者的快速上手指南
- [产品需求文档 (PRD)](.trae/documents/campus_helper_prd.md)
- [技术架构文档](.trae/documents/campus_helper_technical_architecture.md)
- [部署指南](.trae/documents/DEPLOYMENT.md)
- [用户手册](.trae/documents/USER_MANUAL.md)
- [Supabase 配置指南](SUPABASE_SETUP_GUIDE.md)
- [小程序部署指南](MINIPROGRAM_DEPLOYMENT.md)

---

## 👥 给 AI 开发者的建议

当你接手这个项目时，请按以下顺序操作：

1. **阅读本文档** - 理解四端架构
2. **阅读 QUICKSTART.md** - 快速上手
3. **查看关键文件** - 特别是 `amap-h5.html` 和 `WebviewAmapView`
4. **启动开发** - 根据需要启动对应的端

**⚠️ 特别注意**：
- 微信小程序端的地图功能完全由独立 Web 服务提供
- 不要在小程序端重复实现地图功能
- 地图相关的修改主要在 `amap-h5.html` 中进行
- 通信问题在 `WebviewAmapView` 中处理

---

## 📝 更新日志

| 日期 | 版本 | 更新内容 |
|-----|------|---------|
| 2026-03-27 | v2.0 | 更新为四端架构，详细说明独立地图 Web 服务 |
| 2026-03-26 | v1.0 | 初始版本 - 项目基础架构搭建、高德地图 Key 配置、小程序编译修复 |

---

## 📄 许可证

本项目仅供学习和研究使用。

---

**祝项目顺利！** 🚀

---

*文档最后更新：2026-03-27*
