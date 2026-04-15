-- 移除唯一约束，允许追加评论
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_task_id_reviewer_id_reviewee_id_key;
