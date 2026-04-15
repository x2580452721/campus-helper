-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    credit_score INTEGER DEFAULT 100 CHECK (credit_score >= 0 AND credit_score <= 1000),
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher_id UUID NOT NULL REFERENCES public.users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('delivery', 'help', 'tutoring', 'other')),
    reward DECIMAL(10,2) NOT NULL CHECK (reward > 0),
    location JSONB NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'accepted', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create task_acceptances table
CREATE TABLE IF NOT EXISTS public.task_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    acceptor_id UUID NOT NULL REFERENCES public.users(id),
    status VARCHAR(20) DEFAULT 'accepted' CHECK (status IN ('accepted', 'completed', 'cancelled')),
    completion_proof TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(task_id) -- One task can only be accepted by one person
);

-- 4. Create credit_history table
CREATE TABLE IF NOT EXISTS public.credit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    change_amount INTEGER NOT NULL,
    reason VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id),
    payer_id UUID NOT NULL REFERENCES public.users(id),
    payee_id UUID REFERENCES public.users(id),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'completed')),
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 8. Basic Permissions (Granting access to anon and authenticated roles)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 9. RLS Policies

-- Users
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Tasks
CREATE POLICY "Anyone can view published tasks" ON public.tasks FOR SELECT USING (status IN ('published', 'accepted', 'completed'));
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = publisher_id);
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = publisher_id);

-- Task Acceptances
CREATE POLICY "Acceptors and publishers can view acceptances" ON public.task_acceptances FOR SELECT 
    USING (auth.uid() = acceptor_id OR auth.uid() IN (SELECT publisher_id FROM public.tasks WHERE id = task_id));
CREATE POLICY "Authenticated users can accept tasks" ON public.task_acceptances FOR INSERT WITH CHECK (auth.uid() = acceptor_id);

-- Credit History
CREATE POLICY "Users can view their own credit history" ON public.credit_history FOR SELECT USING (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT 
    USING (auth.uid() = payer_id OR auth.uid() = payee_id);

-- Messages
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark their own messages as read" ON public.messages FOR UPDATE USING (auth.uid() = user_id);

-- 10. Indexes
CREATE INDEX idx_tasks_publisher ON public.tasks(publisher_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_acceptances_task ON public.task_acceptances(task_id);
CREATE INDEX idx_acceptances_acceptor ON public.task_acceptances(acceptor_id);
CREATE INDEX idx_messages_user ON public.messages(user_id);
