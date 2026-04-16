# 校园互助平台 - 测试账号文档

## 一、小程序端测试账号

### 10个测试手机号
| 序号 | 手机号 | 验证码 | 用途 |
|------|--------|--------|------|| 1 | `13800138000` | `123456` | 主测试账号 |
| 2 | `13800138001` | `123456` | 备用账号 |
| 3 | `13800138002` | `123456` | 备用账号 |
| 4 | `13800138003` | `123456` | 备用账号 |
| 5 | `13800138004` | `123456` | 备用账号 |
| 6 | `13800138005` | `123456` | 备用账号 |
| 7 | `13800138006` | `123456` | 备用账号 |
| 8 | `13800138007` | `123456` | 备用账号 |
| 9 | `13800138008` | `123456` | 备用账号 |
| 10 | `13800138009` | `123456` | 备用账号 |

### 校园身份认证测试数据
| 字段 | 值 |
|------|-----|
| 真实姓名 | `张三`（随意填写） |
| 学号 | `2024000001`（8-12位数字，不能重复） |
| 学院 | `计算机学院` |
| 专业 | `软件工程`（选填） |

---

## 二、服务地址

| 服务 | 地址 |
|------|------|
| Admin 后台 | http://localhost:5174/ |
| 小程序 H5 端 | http://localhost:10087/ |

---

## 三、数据库配置说明

### 已执行的 SQL 配置

```sql
-- RLS 策略（宽松模式，开发用）
CREATE POLICY "Allow all view" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.users FOR UPDATE USING (true);

-- task_acceptances 表 RLS 策略
CREATE POLICY "Allow all view acceptances" ON public.task_acceptances FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert acceptances" ON public.task_acceptances FOR INSERT WITH CHECK (true);

-- 用户注册触发器（自动创建 users 记录）
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Supabase 后台配置
- **邮箱验证**：已关闭（Authentication → Providers → Email → Confirm email）
- **RLS**：已启用宽松策略

---

## 四、登录原理说明

### 开发模式绕过方案
由于短信服务需要付费配置，开发模式使用邮箱+密码登录：

- **邮箱格式**：`${手机号}@campus.local`
- **密码格式**：`dev_${手机号}`
- 示例：手机号 `13800138000` → 邮箱 `13800138000@campus.local`，密码 `dev_13800138000`

### 注册流程
1. 用户输入手机号和验证码
2. 开发模式检测到测试手机号，使用邮箱+密码注册
3. Supabase 创建 auth.users 记录
4. 触发器自动在 public.users 表创建用户资料
5. 跳转到校园认证页面

---

## 五、多用户测试说明

### 当前支持
- **10个测试手机号**，每个可注册一个独立用户
- 不同手机号对应不同的邮箱和用户记录

### 测试场景
1. **单用户测试**：使用 `13800138000` 完成完整流程
2. **多用户测试**：使用不同手机号模拟发布者和接单者
3. **抢单测试**：一个用户发布任务，另一个用户抢单

---

## 六、正式环境配置建议

### 邮箱验证码（推荐）
- 免费，无需额外配置
- 在 Supabase 后台启用 Email OTP 即可
- 用户体验良好

### 短信验证码
- 需配置短信服务商（Twilio/阿里云/腾讯云）
- 费用约 0.05-0.1 元/条
- 配置路径：Supabase → Authentication → Providers → SMS

---

## 七、常见问题

### Q: 登录后提示"用户信息不存在"
A: 检查触发器是否正确执行，在 SQL Editor 运行：
```sql
SELECT * FROM public.handle_new_user();
```

### Q: 认证失败
A: 检查学号格式（8-12 位数字）和是否重复

### Q: 状态切换无反应
A: 需要先完成校园身份认证才能接单

### Q: 抢单失败
A: 在 Supabase SQL Editor 执行：
```sql
-- 修复 task_acceptances RLS
DROP POLICY IF EXISTS "Acceptors and publishers can view acceptances" ON public.task_acceptances;
CREATE POLICY "Allow all view acceptances" ON public.task_acceptances FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert acceptances" ON public.task_acceptances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update own acceptances" ON public.task_acceptances FOR UPDATE USING (true);
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
```

### Q: 任务列表不显示
A: 检查工作状态是否为"接单中"，并确认已允许位置权限

### Q: 地图加载失败
A: 检查高德地图 Key 配置和网络连接

---

## 八、测试数据生成

### 8.1 测试任务数据
可以通过管理后台或 SQL 脚本创建测试任务：
```sql
-- 示例：创建测试任务
INSERT INTO public.tasks (
  publisher_id,
  title,
  description,
  task_type,
  reward,
  location_id,
  status
) VALUES (
  '测试用户 ID',
  '取快递测试',
  '帮忙取快递',
  '取物',
  10,
  1,
  'pending'
);
```

### 8.2 测试地点数据
系统已预置校园地点数据，包括：
- 教学楼（1-10 栋）
- 宿舍楼（1-8 栋）
- 食堂（一食堂、二食堂）
- 图书馆
- 体育馆
- 快递点

---

## 九、测试场景示例

### 场景 1：完整任务流程
1. 用户 A 登录并认证
2. 用户 A 发布任务（取快递）
3. 用户 B 登录并认证
4. 用户 B 切换到"接单中"状态
5. 用户 B 查看任务列表并接单
6. 用户 B 完成任务
7. 用户 A 评价任务
8. 验证双方信用分变化

### 场景 2：多用户并发抢单
1. 用户 A 发布高奖励任务
2. 用户 B、C、D 同时抢单
3. 验证只有一个用户抢单成功
4. 验证任务状态正确更新

### 场景 3：管理后台审核
1. 管理员登录后台
2. 查看待审核任务
3. 审核通过/拒绝任务
4. 查看数据统计

---

## 十、性能测试建议

### 10.1 负载测试
- 模拟 50+ 并发用户
- 测试任务列表加载性能
- 测试地图渲染性能

### 10.2 压力测试
- 大量任务数据下的搜索性能
- 长列表滚动流畅度
- 内存占用监控

---

*最后更新：2026-03-25*
