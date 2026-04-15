-- Fix RLS policies for task_acceptances to allow insert
DROP POLICY IF EXISTS "Authenticated users can accept tasks" ON public.task_acceptances;

CREATE POLICY "Allow all insert" ON public.task_acceptances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all select" ON public.task_acceptances FOR SELECT USING (true);
