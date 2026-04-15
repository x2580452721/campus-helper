-- 1. 允许管理员更新所有用户资料
CREATE POLICY "Admins can update all user profiles" 
ON public.users 
FOR UPDATE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 2. 允许管理员插入信用历史记录
CREATE POLICY "Admins can insert credit history" 
ON public.credit_history 
FOR INSERT 
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 3. 允许管理员查看所有信用历史 (之前只允许看自己的)
CREATE POLICY "Admins can view all credit history" 
ON public.credit_history 
FOR SELECT 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
