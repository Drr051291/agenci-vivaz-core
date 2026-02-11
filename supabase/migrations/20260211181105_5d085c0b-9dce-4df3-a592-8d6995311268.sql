-- Allow public access to tasks when the client has a meeting with a share token or slug
CREATE POLICY "Public can view tasks for shared meetings"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_minutes mm
    WHERE mm.client_id = tasks.client_id
    AND (mm.share_token IS NOT NULL OR mm.slug IS NOT NULL)
  )
);