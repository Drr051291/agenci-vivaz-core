-- Add column to track which meetings a task has been excluded from in Retrovisor
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS meeting_excluded_from uuid[] DEFAULT '{}';