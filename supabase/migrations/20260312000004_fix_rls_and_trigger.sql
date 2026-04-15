-- Fix RLS policies for users table to allow signup
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Allow all view" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create more permissive policies for development
CREATE POLICY "Allow all view" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.users FOR UPDATE USING (true);

-- Grant all necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Make student_id and name nullable (run again to ensure)
ALTER TABLE public.users ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;

-- Create function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, phone, nickname, name, student_id, credit_score, role, status, work_status)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, COALESCE(NEW.raw_user_meta_data->>'phone', 'unknown') || '@campus.local'),
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
        COALESCE(NEW.raw_user_meta_data->>'nickname', '用户'),
        COALESCE(NEW.raw_user_meta_data->>'nickname', '用户'),
        NULL,
        100,
        'student',
        'unverified',
        'off'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
