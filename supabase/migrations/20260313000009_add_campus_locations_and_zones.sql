-- 创建地点表
CREATE TABLE IF NOT EXISTS campus_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    zone_id UUID,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建区域表
CREATE TABLE IF NOT EXISTS campus_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    border_color TEXT DEFAULT '#3b82f6',
    path JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加外键约束
ALTER TABLE campus_locations
    ADD CONSTRAINT fk_campus_locations_zone
    FOREIGN KEY (zone_id)
    REFERENCES campus_zones(id)
    ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_campus_locations_zone ON campus_locations(zone_id);
CREATE INDEX IF NOT EXISTS idx_campus_locations_active ON campus_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_campus_zones_active ON campus_zones(is_active);

-- 创建 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campus_locations_updated_at
    BEFORE UPDATE ON campus_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campus_zones_updated_at
    BEFORE UPDATE ON campus_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 设置 RLS 策略
ALTER TABLE campus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_zones ENABLE ROW LEVEL SECURITY;

-- 所有人可以读取地点和区域
CREATE POLICY "Allow public read access to campus_locations"
    ON campus_locations
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to campus_zones"
    ON campus_zones
    FOR SELECT
    USING (true);

-- 只有管理员可以修改地点和区域
CREATE POLICY "Allow admin full access to campus_locations"
    ON campus_locations
    FOR ALL
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR 
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%admin%'
    )
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR 
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%admin%'
    );

CREATE POLICY "Allow admin full access to campus_zones"
    ON campus_zones
    FOR ALL
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR 
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%admin%'
    )
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR 
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%admin%'
    );
