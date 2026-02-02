
-- Create edu_categories table
CREATE TABLE public.edu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'client')),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create edu_tags table
CREATE TABLE public.edu_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create edu_resources table
CREATE TABLE public.edu_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('training_recording', 'youtube', 'document', 'external_link')),
  url TEXT,
  file_path TEXT,
  category_id UUID REFERENCES public.edu_categories(id) ON DELETE SET NULL,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'client')),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  duration_minutes INTEGER,
  level TEXT CHECK (level IN ('basico', 'intermediario', 'avancado')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create edu_resource_tags (many-to-many)
CREATE TABLE public.edu_resource_tags (
  resource_id UUID NOT NULL REFERENCES public.edu_resources(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.edu_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

-- Create sdr_playbook_sections table
CREATE TABLE public.sdr_playbook_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'client')),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  content_md TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sdr_process_stages table
CREATE TABLE public.sdr_process_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'client')),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  definition_md TEXT,
  entry_criteria_md TEXT,
  exit_criteria_md TEXT,
  checklist_json JSONB DEFAULT '[]'::jsonb,
  templates_json JSONB DEFAULT '[]'::jsonb,
  objections_json JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create glossary_terms table
CREATE TABLE public.glossary_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'client')),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  definition_md TEXT,
  rules_md TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(key, scope, client_id)
);

-- Enable RLS on all tables
ALTER TABLE public.edu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_playbook_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_process_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for edu_categories
CREATE POLICY "Admin/collaborator can manage categories"
ON public.edu_categories FOR ALL
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Client users can view their categories"
ON public.edu_categories FOR SELECT
USING (
  scope = 'global' OR 
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
);

-- RLS Policies for edu_tags
CREATE POLICY "Anyone authenticated can view tags"
ON public.edu_tags FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/collaborator can manage tags"
ON public.edu_tags FOR ALL
USING (public.is_admin_or_collaborator(auth.uid()));

-- RLS Policies for edu_resources
CREATE POLICY "Admin/collaborator can manage resources"
ON public.edu_resources FOR ALL
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Client users can view their resources"
ON public.edu_resources FOR SELECT
USING (
  scope = 'global' OR 
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
);

-- RLS Policies for edu_resource_tags
CREATE POLICY "Anyone authenticated can view resource tags"
ON public.edu_resource_tags FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/collaborator can manage resource tags"
ON public.edu_resource_tags FOR ALL
USING (public.is_admin_or_collaborator(auth.uid()));

-- RLS Policies for sdr_playbook_sections
CREATE POLICY "Admin/collaborator can manage playbook sections"
ON public.sdr_playbook_sections FOR ALL
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "SDR and client users can view playbook sections"
ON public.sdr_playbook_sections FOR SELECT
USING (
  public.is_admin_or_collaborator(auth.uid()) OR
  scope = 'global' OR 
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
);

-- RLS Policies for sdr_process_stages
CREATE POLICY "Admin/collaborator can manage process stages"
ON public.sdr_process_stages FOR ALL
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "SDR and client users can view process stages"
ON public.sdr_process_stages FOR SELECT
USING (
  public.is_admin_or_collaborator(auth.uid()) OR
  scope = 'global' OR 
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
);

-- RLS Policies for glossary_terms
CREATE POLICY "Admin/collaborator can manage glossary"
ON public.glossary_terms FOR ALL
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Anyone authenticated can view glossary"
ON public.glossary_terms FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_edu_resources_scope ON public.edu_resources(scope);
CREATE INDEX idx_edu_resources_client ON public.edu_resources(client_id);
CREATE INDEX idx_edu_resources_category ON public.edu_resources(category_id);
CREATE INDEX idx_edu_resources_type ON public.edu_resources(type);
CREATE INDEX idx_sdr_stages_scope ON public.sdr_process_stages(scope);
CREATE INDEX idx_sdr_stages_client ON public.sdr_process_stages(client_id);
CREATE INDEX idx_glossary_key ON public.glossary_terms(key);

-- Trigger for updated_at
CREATE TRIGGER update_edu_resources_updated_at
BEFORE UPDATE ON public.edu_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sdr_playbook_sections_updated_at
BEFORE UPDATE ON public.sdr_playbook_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sdr_process_stages_updated_at
BEFORE UPDATE ON public.sdr_process_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_glossary_terms_updated_at
BEFORE UPDATE ON public.glossary_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial global data
INSERT INTO public.edu_categories (name, scope) VALUES
  ('Onboarding', 'global'),
  ('Vendas', 'global'),
  ('Marketing', 'global'),
  ('Processos', 'global'),
  ('Ferramentas', 'global');

INSERT INTO public.edu_tags (name) VALUES
  ('SDR'),
  ('Closer'),
  ('CRM'),
  ('Prospecção'),
  ('Qualificação'),
  ('Follow-up'),
  ('Negociação'),
  ('Pipedrive');

-- Seed global glossary terms
INSERT INTO public.glossary_terms (key, scope, definition_md, rules_md) VALUES
  ('lead', 'global', 'Todo lead que cai no CRM.', NULL),
  ('mql', 'global', 'Lead qualificado pelo marketing com potencial de compra.', NULL),
  ('sql', 'global', 'Reunião agendada (call).', NULL),
  ('oportunidade', 'global', 'Lead com interesse confirmado e em negociação.', NULL),
  ('contrato', 'global', 'Negócio fechado com contrato assinado.', NULL);

-- Seed global process stages
INSERT INTO public.sdr_process_stages (name, scope, order_index, definition_md, entry_criteria_md, exit_criteria_md, checklist_json, templates_json, objections_json) VALUES
  ('Lead', 'global', 1, 'Todo contato que entra no funil de vendas.', 'Formulário preenchido ou contato inicial realizado.', 'Lead qualificado e movido para MQL.', 
   '[{"label": "Verificar dados de contato", "required": true}, {"label": "Identificar empresa", "required": true}, {"label": "Registrar origem do lead", "required": false}]',
   '[{"type": "email", "title": "Primeiro contato", "content": "Olá [Nome],\\n\\nObrigado pelo interesse..."}]',
   '[{"objection": "Não tenho tempo agora", "response": "Entendo perfeitamente! Posso agendar uma ligação de 10 minutos para a próxima semana?"}]'),
  ('MQL', 'global', 2, 'Lead qualificado pelo marketing.', 'Lead demonstrou interesse qualificado.', 'Reunião agendada ou desqualificado.', 
   '[{"label": "Validar fit com ICP", "required": true}, {"label": "Confirmar budget", "required": false}, {"label": "Identificar decisor", "required": true}]',
   '[{"type": "whatsapp", "title": "Follow-up MQL", "content": "Oi [Nome]! Tudo bem? Vi que você..."}]',
   '[{"objection": "Preciso falar com meu sócio", "response": "Ótimo! Que tal agendarmos uma call com vocês dois?"}]'),
  ('SQL', 'global', 3, 'Reunião agendada com o lead.', 'Call/reunião confirmada no calendário.', 'Proposta enviada ou lead desqualificado.', 
   '[{"label": "Confirmar horário da call", "required": true}, {"label": "Enviar reminder", "required": true}, {"label": "Preparar apresentação", "required": false}]',
   '[{"type": "email", "title": "Confirmação de reunião", "content": "Confirmando nossa reunião para [data]..."}]',
   '[{"objection": "O preço está alto", "response": "Vamos analisar o ROI juntos..."}]'),
  ('Oportunidade', 'global', 4, 'Lead em negociação ativa.', 'Proposta apresentada ou orçamento enviado.', 'Contrato fechado ou perdido.', 
   '[{"label": "Proposta enviada", "required": true}, {"label": "Follow-up de negociação", "required": true}]',
   '[{"type": "email", "title": "Proposta comercial", "content": "Segue nossa proposta personalizada..."}]',
   '[{"objection": "Vou pensar", "response": "O que especificamente você gostaria de avaliar melhor?"}]'),
  ('Contrato', 'global', 5, 'Negócio fechado.', 'Proposta aceita e contrato assinado.', 'Handoff para CS/Onboarding.', 
   '[{"label": "Contrato assinado", "required": true}, {"label": "Pagamento confirmado", "required": true}, {"label": "Handoff realizado", "required": true}]',
   '[{"type": "email", "title": "Boas-vindas", "content": "Seja bem-vindo! Estamos muito felizes..."}]',
   '[]');

-- Seed global playbook sections
INSERT INTO public.sdr_playbook_sections (title, scope, order_index, content_md) VALUES
  ('Visão Geral', 'global', 1, '# Visão Geral do Processo SDR

O SDR (Sales Development Representative) é responsável pela qualificação de leads e geração de oportunidades para o time de vendas.

## Objetivo Principal
Qualificar leads e agendar reuniões com potenciais clientes.'),
  ('Atribuições do SDR', 'global', 2, '# Atribuições do SDR

- **Qualificar leads** seguindo os critérios de ICP
- **Seguir cadência** de contato definida
- **Registrar no CRM** todas as interações
- **Agendar calls** com leads qualificados
- **Fazer handoff** para o closer com contexto completo
- **Manter SLA** de tempo de resposta (máx. 5 min para leads quentes)'),
  ('Cadência de Contato', 'global', 3, '# Cadência de Contato

## Dia 1
- Email de apresentação
- Conexão LinkedIn

## Dia 2
- WhatsApp (se tiver número)

## Dia 4
- Email de follow-up

## Dia 7
- Ligação telefônica

## Dia 10
- Email de break-up');

-- Create storage bucket for edu documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('edu-documents', 'edu-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can view edu documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'edu-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin/collaborator can upload edu documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'edu-documents' AND public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admin/collaborator can delete edu documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'edu-documents' AND public.is_admin_or_collaborator(auth.uid()));
