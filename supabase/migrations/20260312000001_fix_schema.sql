-- Fix users table to match PRD
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) DEFAULT '同学';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS work_status VARCHAR(20) DEFAULT 'off' CHECK (work_status IN ('off', 'active', 'standby'));

-- Make student_id and name nullable for unverified users
ALTER TABLE public.users ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;

-- Fix status enum to match PRD
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (status IN ('unverified', 'verified', 'banned'));

-- Update existing records
UPDATE public.users SET status = 'verified' WHERE status = 'active';
UPDATE public.users SET status = 'unverified' WHERE status = 'suspended';

-- Add priority column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_nickname ON public.users(nickname);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_work_status ON public.users(work_status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

-- Fix RLS policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create new RLS policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
