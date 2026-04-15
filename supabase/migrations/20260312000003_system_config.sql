-- 1. 创建系统配置表
CREATE TABLE IF NOT EXISTS public.system_config (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(200),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 插入默认配置
INSERT INTO public.system_config (key, value, description)
VALUES 
    ('min_credit_score', '60', '接单最低信用分门槛'),
    ('task_timeout_hours', '48', '任务自动超时时间(小时)'),
    ('platform_fee_percent', '0', '平台抽成比例(%)')
ON CONFLICT (key) DO NOTHING;

-- 3. 开启 RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- 4. 策略：所有人可读 (小程序需要读取配置)
CREATE POLICY "Everyone can read system config" 
ON public.system_config 
FOR SELECT 
USING (true);

-- 5. 策略：仅管理员可修改
CREATE POLICY "Admins can update system config" 
ON public.system_config 
FOR UPDATE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
