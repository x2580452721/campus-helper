-- Fix RLS policies for tasks table to allow update
DROP POLICY IF EXISTS "Allow all view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can view published tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;

-- Create new policies
CREATE POLICY "Allow all view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete tasks" ON public.tasks FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
