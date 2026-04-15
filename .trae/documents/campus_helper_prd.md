# 软件工程实践：产品需求说明（PRD）

## 一：全局上下文与架构约束 (Context & Constraints)

* **前端框架：**

  * 小程序端：Taro (React) + TypeScript + NutUI-React

  * 管理后台：React\@18 + TypeScript + TailwindCSS + Ant Design

* **后端框架与数据库：** Supabase (BaaS) + PostgreSQL

* **外部集成：** 高德地图小程序 SDK (定位与地图) + 微信/支付宝支付 API

* **强制规范：**

  * 所有 API 调用必须通过 Supabase SDK 进行，遵循 RLS (Row Level Security) 权限控制。

  * 前端状态管理优先使用 React Context + useReducer。

  * 小程序端页面路径需在 `app.config.ts` 中统一配置。

  * 必须支持小程序原生交互规范，确保各端体验一致。

***

## 二：核心功能（MVP功能）与操作流程 (Core Workflows)

## 核心功能 1：用户认证体系 (User Authentication)

* **用户故事 (User Story)：** 作为一名在校学生，我希望通过“手机号+姓名+学号”进行双重认证，以便于加入纯净的校园互助网络。

* **隐私脱敏：** 前端互动仅展示昵称/姓氏，真实学号与敏感标签仅在后台加密存储。

* **页面交互与执行步骤 (Step-by-Step Flow)：**

  1. 用户进入 `/login` 页面，选择“手机号一键登录”或“验证码登录”。
  2. 登录成功后，系统判断 `student_id` 是否为空。
  3. 若为空，跳转至 `/auth/verify` 页面，要求填写：

     * 真实姓名

     * 学号

     * 上传学生证/校园卡照片（OCR 识别）
  4. **系统校验：**

     * 校验学号格式。

     * 校验学号是否已被注册。
  5. **数据操作：** 更新 `users` 表，设置 `status` 为 `verified`。

## 核心功能 2：三态切换与精准推送 (Three-State Engine & Push)

* **用户故事 (User Story)：** 作为一名接单者，我希望能够根据自己的状态（上课、空闲、回寝）灵活接收任务推送，避免被打扰。

* **状态定义：**

  * **不接单 (Off)**: 绝对静默，无定位，无通知。

  * **接单中 (Active)**: 实时 GPS 匹配 300-500 米内订单。

  * **智能挂起 (Standby)**: 基于课表/预设下课时间，下课前 3 分钟触发“顺路单”推送。

* **精准调度策略：**

  * **黄金时间窗**：下课前 3 分钟预警，推送教学楼到宿舍的顺路单。

  * **15秒优先决策**：订单推送后，给予用户 15 秒独占期。

  * **最近优先**：紧急求助单优先推给同楼栋或百米内用户。

## 核心功能 3：发布互助任务 (Publish Task)

* **用户故事 (User Story)：** 作为一名经过认证的学生，我希望能够发布生活代取或校园求助任务，并设置合理的酬金。

* **任务分级策略：**

  * **生活代取**：追求“快与准”，匹配 15 秒快决策。

  * **校园求助**：区分普通与紧急，紧急单最高优先级。

  * **勤工俭学**（二期）：长决策锁定。

* **页面交互与执行步骤 (Step-by-Step Flow)：**

  1. 用户进入 `/task/publish` 页面。
  2. 填写任务信息，选择任务类型（代取/求助）。
  3. 设置酬金和截止时间。
  4. 选择位置（高德地图选点）。
  5. **系统校验与发布**。

## 核心功能 4：接受/抢单任务 (Accept Task)

* **用户故事 (User Story)：** 作为一名希望赚取外快或互助的学生，我希望能在地图或列表中看到附近的任务并快速接单。

* **页面交互与执行步骤 (Step-by-Step Flow)：**

  1. 用户在首页根据当前状态（Active/Standby）接收推送或主动浏览。
  2. 点击任务查看详情。
  3. 点击“立即接单”（若在 15 秒优先期内，需展示倒计时）。
  4. **数据操作：** 开启事务，更新任务状态。

## 核心功能 5：后台任务审核 (Admin Task Audit)

* **用户故事 (User Story)：** 作为平台管理员，我需要审核新发布的任务内容，确保其符合校园规范。

* **页面交互与执行步骤 (Step-by-Step Flow)：**

  1. 管理员进入 `/admin/tasks` 页面。
  2. 审核 `pending` 状态的任务。
  3. 选择“通过”或“拒绝”。

***

## 三：数据领域模型 (Data Models & Schema)

## 表 1：用户信息表 (`users`)

| 字段名            | 数据类型    | 约束条件                             | 说明          |
| :------------- | :------ | :------------------------------- | :---------- |
| `id`           | UUID    | PK, Default: auth.uid()          | 用户唯一标识      |
| `student_id`   | String  | Unique, Nullable                 | 学号（认证后非空）   |
| `phone`        | String  | Unique                           | 手机号         |
| `name`         | String  | Nullable                         | 真实姓名（认证后非空） |
| `nickname`     | String  | Default: '同学'                    | 昵称（脱敏展示）    |
| `work_status`  | Enum    | 'off'/'active'/'standby'         | 接单状态        |
| `credit_score` | Integer | Default: 100                     | 信用分         |
| `status`       | Enum    | 'unverified'/'verified'/'banned' | 认证状态        |

## 表 2：任务表 (`tasks`)

| 字段名            | 数据类型   | 约束条件              | 说明         |
| :------------- | :----- | :---------------- | :--------- |
| `id`           | UUID   | PK                | 任务唯一标识     |
| `publisher_id` | UUID   | FK -> users.id    | 发布者 ID     |
| `title`        | String | NOT NULL          | 任务标题       |
| `priority`     | Enum   | 'normal'/'urgent' | 优先级（普通/紧急） |
| `status`       | Enum   | 见状态机说明            | 任务当前状态     |

***

## 四：核心状态机 (State Machine)

**目标对象：** 任务状态 (`tasks.status`)

* `pending` (待审核)

* `published` (已发布)

* `accepted` (已接单)

* `completed` (已完成)

* `cancelled` (已取消)

***

## 五：防御性边界与异常流 (Edge Cases)

## 5.1 权限与越权防御

* **非本人编辑：** RLS 策略强制校验 `auth.uid() == publisher_id`。

* **认证拦截：** 未认证用户禁止发布或接单。

## 5.2 并发与数据异常防御

* **重复接单：** 数据库唯一约束。

* **信用分约束：** 接单前强制校验。

***

## 六：项目管理与质量跟踪

* **需求规格说明书 (SRS)**: [详细技术要求](file:///d:/ai_project/Campus%20Helper/.trae/documents/campus_helper_srs.md)

* **项目进度表 (Roadmap)**: [功能点勾选与计划](file:///d:/ai_project/Campus%20Helper/.trae/documents/project_roadmap.md)

* **需求及 Bug 管理**: [缺陷追踪](file:///d:/ai_project/Campus%20Helper/.trae/documents/requirements_and_bugs.md)

***

