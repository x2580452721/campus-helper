# Supabase 项目保活指南

## 概述

本指南帮助你防止 Supabase 免费版项目因 7 天无活动而被自动暂停。

## 问题

Supabase 免费版项目在 **7 天无数据库活动** 后会被自动暂停。暂停超过 **90 天** 后，项目会被完全停用，域名被释放，需要创建新项目并恢复数据。

## 解决方案

我们使用 GitHub Actions 自动定期 ping 数据库，保持项目活跃。

## 文件说明

1. **`.github/workflows/keep-supabase-alive.yml`** - GitHub Actions 工作流配置
2. **`supabase/migrations/20260512000000_add_pings_table.sql`** - 数据库迁移文件

## 设置步骤

### 1. 应用数据库迁移

首先，你需要在 Supabase 数据库中创建 `pings` 表：

1. 打开你的 Supabase 项目
2. 进入 **SQL Editor**（左侧菜单）
3. 点击 **New Query**
4. 复制 `supabase/migrations/20260512000000_add_pings_table.sql` 的完整内容
5. 粘贴到编辑器中
6. 点击 **Run** 执行

或者，如果你使用 Supabase CLI：

```bash
supabase db push
```

### 2. 配置 GitHub Secrets

在你的 GitHub 仓库中配置以下 Secrets：

1. 打开 GitHub 仓库
2. 点击 **Settings**
3. 在左侧菜单选择 **Secrets and variables** → **Actions**
4. 点击 **New repository secret**，添加以下两个 Secret：

   | Secret Name | Value |
   |---|---|
   | `SUPABASE_URL` | 你的 Supabase 项目 URL（例如：`https://abcdefghijklmnopqrst.supabase.co`） |
   | `SUPABASE_ANON_KEY` | 你的 Supabase Anon Key |

### 3. 启用 GitHub Actions

1. 在 GitHub 仓库中点击 **Actions**
2. 如果看到提示，点击 **I understand my workflows, go ahead and enable them**
3. 在左侧菜单找到 **Keep Supabase Alive** 工作流

### 4. 手动测试工作流（可选）

1. 在 Actions 页面，点击 **Keep Supabase Alive**
2. 点击 **Run workflow** 按钮
3. 选择分支（通常是 `main` 或 `master`）
4. 点击绿色的 **Run workflow** 按钮
5. 等待几秒钟，刷新页面，你会看到工作流正在运行
6. 点击进入查看详细日志

## 工作原理

### 工作流配置

- **触发时间**：每 3 天的 UTC 早上 8 点（通过 cron 表达式 `0 8 */3 * *` 配置）
- **也支持手动触发**：可以在 GitHub Actions 界面手动运行

### 执行的操作

每次运行时，工作流会：

1. **健康检查**：简单的 API 请求，确认项目在线
2. **插入 Ping 记录**：在 `pings` 表中插入一条记录（这会创建真实的数据库活动）
3. **清理旧记录**：删除 30 天前的 Ping 记录（防止表无限增长）

## 验证设置

在 Supabase SQL Editor 中运行以下查询，确认 Ping 记录正在被创建：

```sql
SELECT * FROM public.pings ORDER BY created_at DESC LIMIT 10;
```

你应该能看到来自 `github_actions` 的记录。

## 调整定时频率

如果需要更频繁或更不频繁地 ping，编辑 `.github/workflows/keep-supabase-alive.yml` 中的 cron 表达式：

```yaml
schedule:
  - cron: "0 8 */3 * *"  # 每 3 天
```

其他常用的 cron 表达式：
- 每天：`0 8 * * *`
- 每周：`0 8 * * 0`
- 每 2 天：`0 8 */2 * *`

## 故障排除

### 工作流失败

1. 检查 GitHub Secrets 是否正确配置
2. 确认 `pings` 表已创建
3. 查看工作流日志中的错误信息

### 项目还是被暂停了

1. 确认工作流正在正常运行（检查 Actions 页面）
2. 确认 cron 时间表是否合理（不要超过 7 天）
3. 手动触发一次工作流测试

## 升级到 Pro 计划

如果你的项目需要更高的可靠性，可以考虑升级到 Supabase Pro 计划（$25/月），它会：

- 永远不会暂停项目
- 提供更大的存储和带宽
- 支持技术支持
- 提供每日备份

## 安全说明

- `pings` 表使用了宽松的 RLS 策略，因为它只存储非敏感的定时记录
- Anon Key 只能访问公开的数据，不会暴露敏感信息
- GitHub Secrets 是加密存储的，只有 Actions 工作流能访问

## 其他保活方案

如果你不想用 GitHub Actions，也可以考虑：

1. **使用其他 CI/CD 服务**：GitLab CI、CircleCI 等
2. **使用 Cron Job**：在你的服务器上设置定时任务
3. **使用第三方服务**：UptimeRobot、Cron-Job.org 等（需要配置 HTTP 请求）

## 总结

通过这个简单的设置，你的 Supabase 免费项目就不会再因为不活跃而被暂停了！🎉
