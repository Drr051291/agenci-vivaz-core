-- Tabela de configuração da API Asaas (uma só para toda a agência)
CREATE TABLE public.asaas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_encrypted TEXT NOT NULL,
  environment TEXT DEFAULT 'production' CHECK (environment IN ('sandbox', 'production')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de vínculo: cliente Hub <-> cliente Asaas
CREATE TABLE public.asaas_customer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  asaas_customer_id TEXT NOT NULL,
  asaas_customer_name TEXT,
  asaas_customer_email TEXT,
  asaas_customer_cpf_cnpj TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.asaas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_customer_links ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para asaas_config
CREATE POLICY "Admins e colaboradores podem ver configurações Asaas"
ON public.asaas_config
FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins podem inserir configurações Asaas"
ON public.asaas_config
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar configurações Asaas"
ON public.asaas_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para asaas_customer_links
CREATE POLICY "Admins e colaboradores podem ver vínculos de clientes Asaas"
ON public.asaas_customer_links
FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver seus próprios vínculos Asaas"
ON public.asaas_customer_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = asaas_customer_links.client_id
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Admins e colaboradores podem inserir vínculos Asaas"
ON public.asaas_customer_links
FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar vínculos Asaas"
ON public.asaas_customer_links
FOR UPDATE
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar vínculos Asaas"
ON public.asaas_customer_links
FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_asaas_config_updated_at
BEFORE UPDATE ON public.asaas_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_customer_links_updated_at
BEFORE UPDATE ON public.asaas_customer_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();