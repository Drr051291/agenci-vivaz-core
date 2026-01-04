-- Create client_performance_entries table for storing performance analysis snapshots
CREATE TABLE public.client_performance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'inside_sales_matrix',
  period_start DATE,
  period_end DATE,
  channel TEXT,
  summary JSONB NOT NULL DEFAULT '{}',
  diagnostic_id UUID REFERENCES public.inside_sales_diagnostics(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_performance_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view performance entries"
ON public.client_performance_entries
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert performance entries"
ON public.client_performance_entries
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their performance entries"
ON public.client_performance_entries
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their performance entries"
ON public.client_performance_entries
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create meeting_action_links table for linking actions to meetings
CREATE TABLE public.meeting_action_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  performance_entry_id UUID REFERENCES public.client_performance_entries(id) ON DELETE SET NULL,
  action_item JSONB NOT NULL,
  is_task_created BOOLEAN DEFAULT FALSE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_action_links ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view meeting action links"
ON public.meeting_action_links
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert meeting action links"
ON public.meeting_action_links
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update meeting action links"
ON public.meeting_action_links
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete meeting action links"
ON public.meeting_action_links
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add indexes for performance
CREATE INDEX idx_client_performance_entries_client ON public.client_performance_entries(client_id);
CREATE INDEX idx_client_performance_entries_created ON public.client_performance_entries(created_at DESC);
CREATE INDEX idx_meeting_action_links_meeting ON public.meeting_action_links(meeting_id);
CREATE INDEX idx_meeting_action_links_performance ON public.meeting_action_links(performance_entry_id);

-- Add source and source_id columns to tasks table for linking to performance analyses
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_id UUID;