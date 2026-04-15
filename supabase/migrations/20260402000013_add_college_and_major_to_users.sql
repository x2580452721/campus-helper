-- Add college and major fields for user profile
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS college TEXT,
ADD COLUMN IF NOT EXISTS major TEXT;
