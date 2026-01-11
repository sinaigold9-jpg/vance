-- Add task_duration column to packages table (default 5 minutes = 300 seconds)
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS task_duration INTEGER DEFAULT 300;