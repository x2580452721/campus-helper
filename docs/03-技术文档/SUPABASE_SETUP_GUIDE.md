# Supabase 配置完整指南

本指南将帮助你配置 Supabase 以支持邮箱验证码认证和完整的用户注册登录功能。

## 目录

1. [认证配置](#认证配置)
2. [数据库表结构](#数据库表结构)
3. [RLS 策略配置](#rls-策略配置)
4. [邮箱模板配置](#邮箱模板配置)
5. [快速检查清单](#快速检查清单)

---

## 认证配置

### 1. 启用邮箱认证

1. 登录 [Supabase 控制台](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **Authentication** → **Providers**
4. 找到 **Email** 提供商，点击 **Enable** 确保已启用

### 2. 配置认证设置

进入 **Authentication** → **Providers** → **Email**：

**基础设置：**
- ✅ Confirm email: 可以关闭（方便测试），生产环境建议开启
- ✅ Secure email change: 建议开启
- ✅ Double confirm email changes: 建议开启
- ✅ Custom email redirect: `https://servicewechat.com`

**邮件限制：**
- ✅ Rate limit: 根据需要设置（建议：每小时10封）

### 3. URL 配置

进入 **Authentication** → **URL Configuration**：

**Site URL:**
```
https://servicewechat.com
```

**Redirect URLs:**
```
https://servicewechat.com
```

---

## 数据库表结构

### 1. Users 表

确保 `users` 表存在且结构正确：

```sql
-- 如果表不存在，创建 users 表
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100),
    avatar_url TEXT,
    credit_score INTEGER DEFAULT 100,
    role VARCHAR(20) DEFAULT 'student',
    status VARCHAR(20) DEFAULT 'active',
    work_status VARCHAR(20) DEFAULT 'off',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### 2. Tasks 表

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    reward NUMERIC(10, 2) DEFAULT 0,
    type VARCHAR(20) DEFAULT 'other',
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'published',
    location JSONB,
    publisher_id UUID REFERENCES auth.users(id),
    acceptor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_publisher ON tasks(publisher_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

---

## RLS 策略配置

### Users 表策略

```sql
-- 用户可以查看自己的资料
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- 用户可以更新自己的资料
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 新用户可以插入自己的资料
CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 管理员可以查看所有用户
CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

### Tasks 表策略

```sql
-- 所有人可以查看已发布的任务
CREATE POLICY "Anyone can view published tasks"
    ON tasks FOR SELECT
    USING (status = 'published');

-- 认证用户可以创建任务
CREATE POLICY "Authenticated users can create tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 发布者可以更新自己的任务
CREATE POLICY "Publishers can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = publisher_id);

-- 发布者可以删除自己的任务
CREATE POLICY "Publishers can delete own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = publisher_id);
```

### 验证策略是否生效

```sql
-- 查看所有策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 邮箱模板配置

### 1. 配置邮件模板

进入 **Authentication** → **Templates**：

**确认邮件 (Confirm Email):**
```
Subject: 确认你的邮箱 - 校园助手

<p>你好 {{ .Data.email }},</p>
<p>感谢注册校园助手！请点击下面的按钮确认你的邮箱：</p>
<p><a href="{{ .ConfirmationURL }}">确认邮箱</a></p>
<p>如果按钮无法点击，请复制以下链接到浏览器：</p>
<p>{{ .ConfirmationURL }}</p>
<p>如果你没有注册校园助手，请忽略此邮件。</p>
<p>祝好，<br>校园助手团队</p>
```

**验证邮件 (OTP Email):**
```
Subject: 你的验证码 - 校园助手

<p>你好 {{ .Data.email }},</p>
<p>你的验证码是：</p>
<h2 style="font-size: 32px; letter-spacing: 8px; font-weight: bold;">{{ .Token }}</h2>
<p>验证码将在 10 分钟后过期。</p>
<p>如果你没有请求验证码，请忽略此邮件。</p>
<p>祝好，<br>校园助手团队</p>
```

**重置密码邮件 (Reset Password):**
```
Subject: 重置密码 - 校园助手

<p>你好 {{ .Data.email }},</p>
<p>请点击下面的按钮重置你的密码：</p>
<p><a href="{{ .ConfirmationURL }}">重置密码</a></p>
<p>如果按钮无法点击，请复制以下链接到浏览器：</p>
<p>{{ .ConfirmationURL }}</p>
<p>如果你没有请求重置密码，请忽略此邮件。</p>
<p>祝好，<br>校园助手团队</p>
```

---

## 快速检查清单

在开始测试前，请确保已完成以下配置：

### ✅ Supabase 认证配置
- [ ] Email 提供商已启用
- [ ] Site URL 已设置为 `https://servicewechat.com`
- [ ] Redirect URL 已添加 `https://servicewechat.com`
- [ ] 确认邮件选项已配置（测试时可关闭）

### ✅ 数据库配置
- [ ] `users` 表已创建
- [ ] `tasks` 表已创建
- [ ] 所有必要的索引已添加
- [ ] RLS 已启用

### ✅ RLS 策略配置
- [ ] Users 表的 SELECT 策略已创建
- [ ] Users 表的 INSERT 策略已创建
- [ ] Users 表的 UPDATE 策略已创建
- [ ] Tasks 表的 SELECT 策略已创建
- [ ] Tasks 表的 INSERT 策略已创建
- [ ] Tasks 表的 UPDATE 策略已创建
- [ ] Tasks 表的 DELETE 策略已创建

### ✅ 项目配置
- [ ] Supabase URL 正确配置在 `miniapp/config/index.ts`
- [ ] Supabase Anon Key 正确配置
- [ ] 微信小程序合法域名已配置

### ✅ 测试
- [ ] 使用测试邮箱 `test@campus.edu` 可以注册
- [ ] 使用测试邮箱 `test@campus.edu` 可以登录
- [ ] 注册后用户资料自动创建
- [ ] 可以设置密码
- [ ] 可以使用密码登录

---

## 常见问题

### Q1: 邮箱验证码收不到？

**A:** 检查以下几点：
1. 确认 Email 提供商已启用
2. 检查垃圾邮件文件夹
3. 查看 Supabase Auth 日志（Authentication → Logs）
4. 测试时可以使用开发模式的测试邮箱

### Q2: 注册后用户资料没有创建？

**A:** 检查：
1. RLS 策略是否允许 INSERT
2. `users` 表结构是否正确
3. Supabase 客户端是否有正确的权限

### Q3: 登录后显示"获取用户信息失败"？

**A:** 检查：
1. RLS 策略是否允许 SELECT
2. 用户 ID 是否匹配
3. Supabase 会话是否有效

### Q4: 密码设置失败？

**A:** 确认：
1. 用户已通过 OTP 验证
2. 密码长度至少 6 位
3. Supabase Auth 设置允许密码更新

---

## 测试流程

### 1. 开发模式测试

1. 打开小程序
2. 进入注册页面
3. 输入测试邮箱：`test@campus.edu`
4. 点击"获取验证码"
5. 输入测试验证码：`123456`
6. 输入昵称和密码
7. 点击"注册"
8. 应该看到"注册成功"并跳转到首页

### 2. 真实邮箱测试

1. 关闭开发模式（修改 `DEV_MODE = false`）
2. 输入你的真实邮箱
3. 点击"获取验证码"
4. 查收邮箱中的验证码
5. 输入验证码完成注册
6. 验证用户资料是否创建

---

完成以上配置后，你的邮箱认证系统应该可以正常工作了！🎉
