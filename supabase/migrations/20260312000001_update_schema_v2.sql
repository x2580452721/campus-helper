-- 1. Modify users table to add new columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) DEFAULT '同学',
ADD COLUMN IF NOT EXISTS work_status VARCHAR(20) DEFAULT 'off' CHECK (work_status IN ('off', 'active', 'standby'));

-- 2. Modify tasks table to add priority
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent'));

-- 3. Update RLS policies (Only drop if exists to avoid errors, then recreate)
-- Note: In Supabase SQL Editor, we usually just CREATE OR REPLACE or DROP IF EXISTS.
-- Since this is a migration, we assume previous policies exist.

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
