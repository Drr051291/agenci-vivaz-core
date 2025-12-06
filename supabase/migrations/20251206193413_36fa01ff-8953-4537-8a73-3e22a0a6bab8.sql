
-- Create table for Vivaz Dashboard configuration per client
CREATE TABLE public.vivaz_dashboard_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    webhook_token uuid NOT NULL DEFAULT gen_random_uuid(),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(client_id)
);

-- Create table for storing metrics from Make.com
CREATE TABLE public.vivaz_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    channel text NOT NULL,
    metric_date date NOT NULL,
    impressions numeric DEFAULT 0,
    clicks numeric DEFAULT 0,
    conversions numeric DEFAULT 0,
    cost numeric DEFAULT 0,
    reach numeric DEFAULT 0,
    ctr numeric DEFAULT 0,
    cpc numeric DEFAULT 0,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(client_id, channel, metric_date)
);

-- Enable RLS
ALTER TABLE public.vivaz_dashboard_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivaz_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for vivaz_dashboard_config
CREATE POLICY "Admins e colaboradores podem ver config Vivaz" 
ON public.vivaz_dashboard_config 
FOR SELECT 
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem inserir config Vivaz" 
ON public.vivaz_dashboard_config 
FOR INSERT 
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar config Vivaz" 
ON public.vivaz_dashboard_config 
FOR UPDATE 
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar config Vivaz" 
ON public.vivaz_dashboard_config 
FOR DELETE 
USING (is_admin_or_collaborator(auth.uid()));

-- RLS policies for vivaz_metrics
CREATE POLICY "Admins e colaboradores podem ver métricas Vivaz" 
ON public.vivaz_metrics 
FOR SELECT 
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver suas próprias métricas Vivaz" 
ON public.vivaz_metrics 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = vivaz_metrics.client_id 
    AND clients.user_id = auth.uid()
));

CREATE POLICY "Admins e colaboradores podem inserir métricas Vivaz" 
ON public.vivaz_metrics 
FOR INSERT 
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar métricas Vivaz" 
ON public.vivaz_metrics 
FOR DELETE 
USING (is_admin_or_collaborator(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_vivaz_dashboard_config_updated_at
    BEFORE UPDATE ON public.vivaz_dashboard_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vivaz_metrics_updated_at
    BEFORE UPDATE ON public.vivaz_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
