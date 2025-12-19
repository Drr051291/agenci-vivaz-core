-- Create inside_sales_diagnostics table
CREATE TABLE public.inside_sales_diagnostics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  period_label text,
  channel text,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  targets jsonb NOT NULL DEFAULT '{}'::jsonb,
  stage_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create inside_sales_targets table
CREATE TABLE public.inside_sales_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  targets jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create inside_sales_matrix_rules table
CREATE TABLE public.inside_sales_matrix_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage text NOT NULL,
  situation text NOT NULL,
  metric_label text NOT NULL,
  metric_key text NOT NULL,
  action text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inside_sales_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inside_sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inside_sales_matrix_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inside_sales_diagnostics
CREATE POLICY "Admins e colaboradores podem ver diagnósticos"
ON public.inside_sales_diagnostics FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem criar diagnósticos"
ON public.inside_sales_diagnostics FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar diagnósticos"
ON public.inside_sales_diagnostics FOR UPDATE
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar diagnósticos"
ON public.inside_sales_diagnostics FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));

-- RLS Policies for inside_sales_targets
CREATE POLICY "Admins e colaboradores podem ver targets"
ON public.inside_sales_targets FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins podem gerenciar targets"
ON public.inside_sales_targets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for inside_sales_matrix_rules
CREATE POLICY "Todos autenticados podem ver regras da matriz"
ON public.inside_sales_matrix_rules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar regras da matriz"
ON public.inside_sales_matrix_rules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_inside_sales_diagnostics_updated_at
BEFORE UPDATE ON public.inside_sales_diagnostics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inside_sales_targets_updated_at
BEFORE UPDATE ON public.inside_sales_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inside_sales_matrix_rules_updated_at
BEFORE UPDATE ON public.inside_sales_matrix_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default matrix rules
INSERT INTO public.inside_sales_matrix_rules (stage, situation, metric_label, metric_key, action, sort_order) VALUES
-- Stage 1: Lead → MQL
('lead_to_mql', 'Anúncios não atraem atenção', 'CTR baixo', 'ctr', 'Testar novos criativos, headlines e CTAs. Revisar segmentação.', 1),
('lead_to_mql', 'Custo por clique alto demais', 'CPC/CPM alto', 'cpc', 'Otimizar lances, testar públicos diferentes, melhorar quality score.', 2),
('lead_to_mql', 'Landing page não converte', 'CVR clique → lead baixo', 'cvrClickLead', 'Melhorar LP: headline, formulário mais curto, prova social, velocidade.', 3),
('lead_to_mql', 'Leads muito caros', 'CPL alto', 'cpl', 'Revisar oferta, testar lead magnet, melhorar conversão da LP.', 4),
('lead_to_mql', 'Leads de baixa qualidade', '% leads inválidos alto', 'invalidLeadRate', 'Adicionar campos qualificadores, usar captcha, revisar fonte de tráfego.', 5),
('lead_to_mql', 'Falta de dados para qualificar', '% leads com fit preenchido baixo', 'fitFillRate', 'Adicionar campos de qualificação no formulário ou enriquecer dados.', 6),
-- Stage 2: MQL → SQL
('mql_to_sql', 'Demora no primeiro contato', 'TTFT alto', 'ttft', 'Automatizar distribuição de leads, alertas em tempo real, SLA < 5min.', 10),
('mql_to_sql', 'Baixo volume de contato em 24h', 'Contact rate baixo', 'contactRate24h', 'Revisar cadência, distribuição, priorização de leads.', 11),
('mql_to_sql', 'Leads não atendem/respondem', 'Connect rate baixo', 'connectRate', 'Testar horários, canais (WhatsApp, email), personalização.', 12),
('mql_to_sql', 'Vendas rejeitando muitos MQLs', 'SAL rate baixo', 'salRate', 'Alinhar critérios de qualificação entre marketing e vendas.', 13),
('mql_to_sql', 'MQLs parados por muito tempo', 'Aging MQL alto', 'mqlAgingDays', 'Criar SLAs, alertas de aging, revisão semanal de pipeline.', 14),
-- Stage 3: SQL → Reunião
('sql_to_meeting', 'SQLs não viram reuniões', 'Taxa SQL → reunião baixa', 'sqlToMeeting', 'Revisar abordagem, cadência de follow-up, proposta de valor.', 20),
('sql_to_meeting', 'Baixa taxa de resposta', 'Taxa de resposta baixa', 'responseRate', 'Personalizar mensagens, testar diferentes canais e horários.', 21),
('sql_to_meeting', 'Poucas tentativas de contato', 'Nº tentativas/SQL baixo', 'attemptsPerSql', 'Aumentar cadência, usar múltiplos canais, persistência.', 22),
('sql_to_meeting', 'Reuniões sem decisor', '% reuniões com decisor baixo', 'meetingWithDecisionMakerRate', 'Qualificar melhor antes de agendar, perguntar sobre stakeholders.', 23),
('sql_to_meeting', 'Demora para agendar', 'Tempo até agendar alto', 'timeToScheduleDays', 'Oferecer slots imediatos, usar ferramentas de agendamento.', 24),
-- Stage 4: Reunião → Contrato
('meeting_to_win', 'Baixa taxa de fechamento', 'Win rate baixo', 'meetingToWin', 'Revisar pitch, treinar equipe, analisar objeções comuns.', 30),
('meeting_to_win', 'Ciclo de vendas muito longo', 'Ciclo de vendas alto', 'salesCycleDays', 'Criar urgência, simplificar proposta, remover fricções.', 31),
('meeting_to_win', 'Muitas perdas por preço', 'Motivos de perda: preço', 'lossReasons', 'Revisar pricing, ancoragem de valor, negociação.', 32),
('meeting_to_win', 'Descontos muito altos', 'Taxa de desconto alta', 'discountRate', 'Treinar negociação, definir limites, justificar valor.', 33);

-- Insert default targets
INSERT INTO public.inside_sales_targets (name, is_default, targets) VALUES
('Padrão', true, '{
  "ctr": {"value": 1.0, "direction": "min", "label": "CTR (%)"},
  "cpc": {"value": 6.0, "direction": "max", "label": "CPC (R$)"},
  "cpm": {"value": 60.0, "direction": "max", "label": "CPM (R$)"},
  "cvrClickLead": {"value": 6.0, "direction": "min", "label": "CVR clique → lead (%)"},
  "cpl": {"value": 120.0, "direction": "max", "label": "CPL (R$)"},
  "invalidLeadRate": {"value": 10.0, "direction": "max", "label": "% leads inválidos"},
  "leadToMql": {"value": 25.0, "direction": "min", "label": "Lead → MQL (%)"},
  "ttft": {"value": 15.0, "direction": "max", "label": "TTFT (min)"},
  "contactRate24h": {"value": 80.0, "direction": "min", "label": "Contact rate 24h (%)"},
  "connectRate": {"value": 25.0, "direction": "min", "label": "Connect rate (%)"},
  "salRate": {"value": 60.0, "direction": "min", "label": "SAL rate (%)"},
  "mqlToSql": {"value": 25.0, "direction": "min", "label": "MQL → SQL (%)"},
  "sqlToMeeting": {"value": 35.0, "direction": "min", "label": "SQL → Reunião (%)"},
  "meetingWithDecisionMakerRate": {"value": 70.0, "direction": "min", "label": "% reuniões com decisor"},
  "meetingToWin": {"value": 15.0, "direction": "min", "label": "Reunião → Contrato (%)"}
}'::jsonb);