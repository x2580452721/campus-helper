-- Create pings table for keeping Supabase project active
-- This table is used by GitHub Actions to periodically ping the database
-- and prevent the free tier project from being paused due to inactivity

CREATE TABLE IF NOT EXISTS public.pings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL,
    metadata JSONB
);

-- Create index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_pings_created_at ON public.pings(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.pings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: allow anyone to insert (for GitHub Actions)
CREATE POLICY "Enable insert access for all users"
    ON public.pings
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Create RLS policy: allow anyone to delete old records
CREATE POLICY "Enable delete access for all users"
    ON public.pings
    FOR DELETE
    TO public
    USING (true);

-- Create RLS policy: allow select for debugging
CREATE POLICY "Enable read access for all users"
    ON public.pings
    FOR SELECT
    TO public
    USING (true);

-- Comment on the table
COMMENT ON TABLE public.pings IS 'Table for storing periodic pings to keep Supabase project active';
COMMENT ON COLUMN public.pings.source IS 'Source of the ping (e.g., github_actions, manual)';
COMMENT ON COLUMN public.pings.metadata IS 'Optional metadata for the ping';
