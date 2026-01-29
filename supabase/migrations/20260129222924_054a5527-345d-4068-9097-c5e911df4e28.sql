-- Create pipedrive_cache table for caching Pipedrive API responses
CREATE TABLE public.pipedrive_cache (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 300
);

-- Enable RLS
ALTER TABLE public.pipedrive_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and collaborators can manage cache
CREATE POLICY "Admins e colaboradores podem gerenciar cache Pipedrive"
ON public.pipedrive_cache
FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

-- Policy: Anyone authenticated can read cache (for edge function)
CREATE POLICY "Authenticated users podem ler cache Pipedrive"
ON public.pipedrive_cache
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create index for faster TTL checks
CREATE INDEX idx_pipedrive_cache_fetched_at ON public.pipedrive_cache(fetched_at);

-- Add comment
COMMENT ON TABLE public.pipedrive_cache IS 'Cache table for Pipedrive API responses to minimize API calls';