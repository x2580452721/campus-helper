-- Create reviews table for task evaluations
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id),
    reviewee_id UUID NOT NULL REFERENCES public.users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, reviewer_id, reviewee_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for tasks they participated in" ON public.reviews FOR INSERT 
    WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM public.tasks t
            LEFT JOIN public.task_acceptances ta ON t.id = ta.task_id
            WHERE t.id = task_id AND
            (
                (auth.uid() = t.publisher_id AND reviewee_id = ta.acceptor_id) OR
                (auth.uid() = ta.acceptor_id AND reviewee_id = t.publisher_id)
            )
        )
    );

-- Indexes
CREATE INDEX idx_reviews_task ON public.reviews(task_id);
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);
