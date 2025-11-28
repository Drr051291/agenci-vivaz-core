-- Criar tabela para armazenar configurações de CRM
CREATE TABLE public.crm_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL CHECK (crm_type IN ('pipedrive', 'salesforce', 'hubspot')),
  api_key_encrypted TEXT NOT NULL,
  domain TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, crm_type)
);

-- Habilitar RLS
ALTER TABLE public.crm_integrations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins e colaboradores podem ver todas as integrações CRM"
  ON public.crm_integrations
  FOR SELECT
  USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver suas próprias integrações CRM"
  ON public.crm_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = crm_integrations.client_id
        AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins e colaboradores podem inserir integrações CRM"
  ON public.crm_integrations
  FOR INSERT
  WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar integrações CRM"
  ON public.crm_integrations
  FOR UPDATE
  USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar integrações CRM"
  ON public.crm_integrations
  FOR DELETE
  USING (is_admin_or_collaborator(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_crm_integrations_updated_at
  BEFORE UPDATE ON public.crm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();