-- Allow public access to profiles for shared meetings context
CREATE POLICY "Public can view profiles for shared meetings"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT t.assigned_to FROM public.tasks t
    WHERE t.assigned_to IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.meeting_minutes mm
      WHERE mm.client_id = t.client_id
      AND (mm.share_token IS NOT NULL OR mm.slug IS NOT NULL)
    )
  )
);