-- Add profile bio field for the profile edit page.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT;
