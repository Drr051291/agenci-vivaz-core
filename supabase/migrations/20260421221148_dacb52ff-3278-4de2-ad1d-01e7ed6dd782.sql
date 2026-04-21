-- Enable realtime for tasks and meeting_action_links
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.meeting_action_links REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'meeting_action_links'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_action_links;
  END IF;
END $$;

-- Default new meetings to v2 template
ALTER TABLE public.meeting_minutes
  ALTER COLUMN template_version SET DEFAULT 'v2';

-- Index for fast lookups of action plan items per meeting
CREATE INDEX IF NOT EXISTS idx_meeting_action_links_meeting_id
  ON public.meeting_action_links(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_action_links_task_id
  ON public.meeting_action_links(task_id);