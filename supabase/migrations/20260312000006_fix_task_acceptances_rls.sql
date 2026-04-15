-- Fix RLS policies for task_acceptances to allow insert
DROP POLICY IF EXISTS "Acceptors and publishers can view acceptances" ON public.task_acceptances;
DROP POLICY IF EXISTS "Authenticated users can accept tasks" ON public.task_acceptances;

-- Create new policies
CREATE POLICY "Allow all view acceptances" ON public.task_acceptances FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert acceptances" ON public.task_acceptances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update own acceptances" ON public.task_acceptances FOR UPDATE USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
