
-- 1. meta_connections: stores per-client Meta Ads connection config
CREATE TABLE IF NOT EXISTS public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL,
  token_source text NOT NULL DEFAULT 'lovable_secret' CHECK (token_source IN ('lovable_secret', 'db_encrypted')),
  token_ciphertext text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'needs_attention')),
  last_error text,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e colaboradores gerenciam meta_connections"
  ON public.meta_connections FOR ALL
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes visualizam sua própria meta_connection"
  ON public.meta_connections FOR SELECT
  USING (public.get_user_client_id(auth.uid()) = client_id);

-- 2. meta_daily_insights: daily cached data from Meta API
CREATE TABLE IF NOT EXISTS public.meta_daily_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL,
  level text NOT NULL DEFAULT 'account' CHECK (level IN ('account', 'campaign')),
  entity_id text NOT NULL,
  entity_name text NOT NULL DEFAULT '',
  date date NOT NULL,
  impressions bigint NOT NULL DEFAULT 0,
  reach bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  spend numeric(12,2) NOT NULL DEFAULT 0,
  cpm numeric(10,4) NOT NULL DEFAULT 0,
  cpc numeric(10,4) NOT NULL DEFAULT 0,
  ctr numeric(10,4) NOT NULL DEFAULT 0,
  frequency numeric(10,4) NOT NULL DEFAULT 0,
  results numeric(10,2) NOT NULL DEFAULT 0,
  purchases numeric(10,2) NOT NULL DEFAULT 0,
  leads numeric(10,2) NOT NULL DEFAULT 0,
  raw_actions jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, ad_account_id, level, entity_id, date)
);

ALTER TABLE public.meta_daily_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e colaboradores gerenciam meta_daily_insights"
  ON public.meta_daily_insights FOR ALL
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes visualizam seus próprios insights"
  ON public.meta_daily_insights FOR SELECT
  USING (public.get_user_client_id(auth.uid()) = client_id);

-- 3. meta_sync_runs: audit log of sync runs
CREATE TABLE IF NOT EXISTS public.meta_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  records_upserted int DEFAULT 0,
  error_message text
);

ALTER TABLE public.meta_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e colaboradores visualizam sync_runs"
  ON public.meta_sync_runs FOR ALL
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes visualizam seus sync_runs"
  ON public.meta_sync_runs FOR SELECT
  USING (public.get_user_client_id(auth.uid()) = client_id);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_meta_daily_insights_client_date 
  ON public.meta_daily_insights (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_daily_insights_level
  ON public.meta_daily_insights (client_id, level, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_sync_runs_client
  ON public.meta_sync_runs (client_id, started_at DESC);

-- Update triggers
CREATE TRIGGER update_meta_connections_updated_at
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_daily_insights_updated_at
  BEFORE UPDATE ON public.meta_daily_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
