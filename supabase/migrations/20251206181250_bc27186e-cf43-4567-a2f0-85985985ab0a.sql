
-- Tabela para armazenar clientes do Reportei vinculados ao Hub
CREATE TABLE public.reportei_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reportei_client_id TEXT NOT NULL,
  reportei_client_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, reportei_client_id)
);

-- Tabela para armazenar integrações (canais) do Reportei
CREATE TABLE public.reportei_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reportei_client_link_id UUID NOT NULL REFERENCES public.reportei_clients(id) ON DELETE CASCADE,
  reportei_integration_id TEXT NOT NULL,
  channel_type TEXT NOT NULL, -- instagram, facebook, google_ads, google_analytics, etc.
  channel_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reportei_client_link_id, reportei_integration_id)
);

-- Tabela para armazenar métricas históricas
CREATE TABLE public.reportei_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.reportei_integrations(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL,
  widget_name TEXT,
  metric_type TEXT, -- impressions, clicks, reach, conversions, spend, etc.
  metric_value NUMERIC,
  metric_value_text TEXT, -- para valores não numéricos
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_data JSONB, -- dados brutos do widget para referência
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_reportei_metrics_integration ON public.reportei_metrics(integration_id);
CREATE INDEX idx_reportei_metrics_period ON public.reportei_metrics(period_start, period_end);
CREATE INDEX idx_reportei_metrics_type ON public.reportei_metrics(metric_type);
CREATE INDEX idx_reportei_clients_client ON public.reportei_clients(client_id);

-- Enable RLS
ALTER TABLE public.reportei_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportei_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportei_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies para reportei_clients
CREATE POLICY "Admins e colaboradores podem ver clientes Reportei"
ON public.reportei_clients FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem inserir clientes Reportei"
ON public.reportei_clients FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar clientes Reportei"
ON public.reportei_clients FOR UPDATE
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar clientes Reportei"
ON public.reportei_clients FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));

-- RLS Policies para reportei_integrations
CREATE POLICY "Admins e colaboradores podem ver integrações Reportei"
ON public.reportei_integrations FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem inserir integrações Reportei"
ON public.reportei_integrations FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar integrações Reportei"
ON public.reportei_integrations FOR UPDATE
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar integrações Reportei"
ON public.reportei_integrations FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));

-- RLS Policies para reportei_metrics
CREATE POLICY "Admins e colaboradores podem ver métricas Reportei"
ON public.reportei_metrics FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem inserir métricas Reportei"
ON public.reportei_metrics FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar métricas Reportei"
ON public.reportei_metrics FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_reportei_clients_updated_at
BEFORE UPDATE ON public.reportei_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reportei_integrations_updated_at
BEFORE UPDATE ON public.reportei_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
