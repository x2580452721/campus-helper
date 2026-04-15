# 快速开发指南 - 给 AI 开发者

**必读！** 当你接手这个项目时，请先阅读本文档。

---

## 📋 第一步：理解项目架构（5分钟）

### 项目分为四个部分

```
1. 管理后台 (admin/)
   - React + Ant Design
   - 用于管理员管理用户、任务等

2. 小程序 H5 端 (miniapp/ - dev:h5)
   - Taro + React + NutUI
   - 可以在浏览器中直接预览
   - 使用原生地图组件 AmapView

3. 微信小程序端 (miniapp/ - dev:weapp)
   - Taro + React + NutUI
   - 在微信开发者工具中运行
   - ⚠️ **关键**：地图功能完全由独立 Web 服务提供！

4. 独立地图 Web 服务 (miniapp/src/static/amap-h5.html)
   - 纯 HTML + JavaScript + 高德地图 JS API
   - 部署在 Vercel 上
   - ⚠️ **核心！** 所有地图交互都在这里
```

### 最重要的架构图（一定要理解！）

```
微信小程序端 (pages/map/index.tsx)
    │
    │  只提供：
    │  - web-view 组件
    │  - 数据传递（URL 参数）
    │  - 接收消息（postMessage）
    │
    ▼
WebviewAmapView 组件
    │
    ▼
独立地图 Web 服务 (amap-h5.html) ← 所有地图功能在这里！
    │
    │  提供：
    │  - 地图展示
    │  - 任务标记
    │  - 地图选点
    │  - 路线规划
    │  - 返回、定位、导航等按钮
    │  - 与小程序通信
    │
    ▼
高德地图 API
```

---

## 🎯 第二步：明确你要开发哪个端

根据你的任务，选择对应的端：

| 任务 | 开发哪个端？ | 关键文件 |
|-----|------------|---------|
| 管理后台功能 | admin/ | admin/src/pages/ |
| 小程序 H5 功能 | miniapp/ (dev:h5) | miniapp/src/pages/ |
| 微信小程序功能（非地图） | miniapp/ (dev:weapp) | miniapp/src/pages/ |
| **地图相关功能** | **独立地图 Web 服务** | **miniapp/src/static/amap-h5.html** |
| 地图与小程序通信 | WebviewAmapView | miniapp/src/components/WebviewAmapView/ |

---

## ⚠️ 第三步：地图开发的重要规则

**记住这几点，否则你会走弯路：**

### 1. 微信小程序端的地图页面已经简化了

- 原来的返回按钮、定位按钮等都已经被 Web 页面覆盖
- 不要在小程序端添加任何地图相关的 UI
- 小程序端只负责：
  - 提供 web-view 容器
  - 通过 URL 参数给 Web 页面传数据
  - 通过 postMessage 接收 Web 页面的消息

### 2. 地图功能的修改都在 amap-h5.html 中

- `miniapp/src/static/amap-h5.html` 是核心文件
- 所有地图 UI、交互、逻辑都在这里
- 包括：返回按钮、定位按钮、导航按钮等

### 3. 通信机制

**小程序 → WebView（通过 URL 参数）：**
- 在 WebviewAmapView 组件中构建 URL
- 参数包括：lat, lng, markers, mode, showRoute, dockMode 等

**WebView → 小程序（通过 postMessage）：**
- 在 amap-h5.html 中调用 `wx.miniProgram.postMessage()`
- 消息类型包括：pageReady, mapReady, markerClick, locationSelect, back, locate, navigate 等

---

## 🚀 第四步：启动开发环境

### 1. 管理后台

```bash
cd admin
npm install
npm run dev
```
访问：http://localhost:5173

### 2. 小程序 H5 端

```bash
cd miniapp
npm install
npm run dev:h5
```
访问：http://localhost:10086

### 3. 微信小程序端

```bash
cd miniapp
npm install
npm run dev:weapp
```
然后：
1. 打开微信开发者工具
2. 导入项目，选择 miniapp 目录
3. project.config.json 已配置好 miniprogramRoot 为 ./weapp-dist/

### 4. 独立地图 Web 服务（本地调试）

- 你可以直接在浏览器中打开 `miniapp/src/static/amap-h5.html`
- 或者部署到 Vercel 后测试

---

## 📁 第五步：关键文件速查

### 管理后台

| 文件 | 说明 |
|-----|------|
| admin/src/pages/ | 页面 |
| admin/src/components/ | 组件 |
| admin/src/utils/supabase.ts | Supabase 配置 |

### 小程序端

| 文件 | 说明 |
|-----|------|
| miniapp/src/pages/ | 页面 |
| miniapp/src/components/AmapView/ | H5 地图组件 |
| miniapp/src/components/WebviewAmapView/ | **WebView 地图容器（微信小程序用）** |
| miniapp/src/static/amap-h5.html | **独立地图 Web 页面（核心！）** |
| miniapp/src/utils/amap.ts | 地图配置和工具函数 |
| miniapp/src/utils/supabase.ts | Supabase 配置 |
| miniapp/config/index.ts | Taro 配置 |
| miniapp/project.config.json | 微信小程序项目配置 |

---

## 🔧 第六步：常见开发任务指南

### 任务 1：修改地图 UI（比如按钮样式）

**在哪里改？** `miniapp/src/static/amap-h5.html`

**步骤：**
1. 打开 amap-h5.html
2. 找到对应的 HTML 元素或 CSS
3. 修改
4. 测试（可以直接在浏览器打开，或部署到 Vercel）

### 任务 2：添加新的地图功能

**在哪里改？** `miniapp/src/static/amap-h5.html`

**步骤：**
1. 在 amap-h5.html 中添加 JavaScript 代码
2. 如果需要与小程序通信，使用 `wx.miniProgram.postMessage()`
3. 在 WebviewAmapView 组件中处理对应的消息

### 任务 3：小程序端给地图传数据

**在哪里改？** `miniapp/src/components/WebviewAmapView/index.tsx`

**步骤：**
1. 在组件中接收新的 props
2. 在 useMemo 的 src 计算中，添加新的 URL 参数
3. 在 amap-h5.html 中读取并使用这个参数

### 任务 4：地图给小程序发消息

**在哪里改？**
- 发送端：`miniapp/src/static/amap-h5.html`
- 接收端：`miniapp/src/components/WebviewAmapView/index.tsx`

**步骤：**
1. 在 amap-h5.html 中调用：
   ```javascript
   wx.miniProgram.postMessage({
     data: { type: 'yourMessageType', ...otherData }
   })
   ```
2. 在 WebviewAmapView 的 handleMessage 函数中添加对应的 case

### 任务 5：清理小程序地图页面的冗余按钮

**在哪里改？** `miniapp/src/pages/map/index.tsx`

**当前状态：** 页面上可能还有原来的返回按钮、定位按钮等，这些已经被 Web 页面覆盖了，需要删除。

**目标：** 简化页面，只保留 web-view 容器。

---

## 📚 第七步：更多文档

- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - 完整的项目总结
- [技术架构文档](.trae/documents/campus_helper_technical_architecture.md)
- [MINIPROGRAM_DEPLOYMENT.md](./MINIPROGRAM_DEPLOYMENT.md) - 小程序部署指南
- [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) - Supabase 配置指南

---

## 💡 第八步：AI 开发者的工作流程建议

1. **先读本文档** - 理解架构
2. **再读 PROJECT_SUMMARY.md** - 了解全貌
3. **找到关键文件** - 根据你的任务
4. **小步快跑** - 每次改一点，测试一点
5. **有问题？** 先看现有代码，再问

---

## ⚠️ 最后的提醒

**千万不要忘记：**
- 微信小程序端的地图功能完全由独立 Web 服务提供
- 地图相关的修改主要在 `amap-h5.html`
- 不要在小程序端重复实现地图功能
- 小程序端原来的按钮已经被覆盖，需要删除

**祝你开发顺利！** 🚀
