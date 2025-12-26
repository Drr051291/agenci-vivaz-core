-- Desativar o template antigo "Reunião de Performance" (v1)
UPDATE public.meeting_templates 
SET is_active = false, 
    name = 'Reunião de Performance (v1 - Arquivado)'
WHERE template_type = 'performance' AND is_active = true;

-- Adicionar campos para canais em foco e prioridade do próximo período na meeting_minutes
ALTER TABLE public.meeting_minutes 
ADD COLUMN IF NOT EXISTS focus_channels text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS next_period_priority text,
ADD COLUMN IF NOT EXISTS responsible_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS template_version text DEFAULT 'v1';

-- Adicionar campo para insights rápidos nos KPIs
ALTER TABLE public.meeting_metrics
ADD COLUMN IF NOT EXISTS quick_note text;

-- Adicionar campos extras na tabela de canais para "o que funcionou" e "o que ajustar"
ALTER TABLE public.meeting_channels
ADD COLUMN IF NOT EXISTS what_worked text,
ADD COLUMN IF NOT EXISTS what_to_adjust text;

-- Criar tabela para experimentos/recomendações estruturadas
CREATE TABLE IF NOT EXISTS public.meeting_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  idea text NOT NULL,
  objective text,
  how_to_measure text,
  effort text CHECK (effort IN ('P', 'M', 'G')),
  impact text CHECK (impact IN ('low', 'medium', 'high')),
  responsible_id uuid REFERENCES public.profiles(id),
  deadline date,
  task_id uuid REFERENCES public.tasks(id),
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_experiments ENABLE ROW LEVEL SECURITY;

-- RLS policies para meeting_experiments
CREATE POLICY "Admins e colaboradores podem gerenciar experimentos"
ON public.meeting_experiments FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem ver experimentos"
ON public.meeting_experiments FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver experimentos de suas reuniões aprovadas"
ON public.meeting_experiments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    JOIN clients c ON c.id = mm.client_id
    WHERE mm.id = meeting_experiments.meeting_id
    AND c.user_id = auth.uid()
    AND mm.status = 'aprovado'
  )
);

-- Criar tabela para aprovações estruturadas (diferentes de approvalsNeeded atual)
CREATE TABLE IF NOT EXISTS public.meeting_approval_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('budget', 'creatives', 'landing_page', 'tracking', 'other')),
  label text NOT NULL,
  details text,
  value numeric,
  is_approved boolean DEFAULT false,
  approved_by_client boolean DEFAULT false,
  owner_type text DEFAULT 'client' CHECK (owner_type IN ('vivaz', 'client')),
  task_id uuid REFERENCES public.tasks(id),
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_approval_items ENABLE ROW LEVEL SECURITY;

-- RLS policies para meeting_approval_items
CREATE POLICY "Admins e colaboradores podem gerenciar itens de aprovação"
ON public.meeting_approval_items FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem ver itens de aprovação"
ON public.meeting_approval_items FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver itens de aprovação de suas reuniões aprovadas"
ON public.meeting_approval_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    JOIN clients c ON c.id = mm.client_id
    WHERE mm.id = meeting_approval_items.meeting_id
    AND c.user_id = auth.uid()
    AND mm.status = 'aprovado'
  )
);

-- Atualizar meeting_sections para suportar diagnóstico estruturado
-- Adicionar campo de evidência/hipótese
ALTER TABLE public.meeting_sections
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Inserir novo template "Reunião de Performance v2"
INSERT INTO public.meeting_templates (name, description, icon, template_type, estimated_time_min, is_active, schema_json)
VALUES (
  'Reunião de Performance v2',
  'Template otimizado para relatórios de performance de marketing digital. Estrutura guiada que produz um relatório pronto para apresentação em menos de 10 minutos.',
  'BarChart3',
  'performance_v2',
  45,
  true,
  '{
    "version": "2.0",
    "sections": [
      {
        "key": "executive_summary",
        "title": "Resumo Executivo",
        "required": true,
        "fields": [
          {"key": "period_highlights", "label": "O que aconteceu no período", "type": "bullets", "max": 3},
          {"key": "main_wins", "label": "Principais vitórias", "type": "bullets", "max": 2},
          {"key": "main_risks", "label": "Principais riscos / atenção", "type": "bullets", "max": 2},
          {"key": "next_priority", "label": "Prioridade do próximo período", "type": "select", "options": ["Crescimento", "Eficiência", "Retenção", "Aquisição", "Conversão", "Receita"]}
        ]
      },
      {
        "key": "kpis",
        "title": "KPIs do Período",
        "required": true,
        "fields": [
          {"key": "metrics", "type": "metrics_table", "defaults": ["Investimento", "Leads", "CPL", "Conversões", "CPA", "ROAS", "Receita"]},
          {"key": "highlight", "label": "Maior destaque", "type": "text"},
          {"key": "lowlight", "label": "Maior queda", "type": "text"}
        ]
      },
      {
        "key": "channel_performance",
        "title": "Performance por Canal",
        "required": false,
        "fields": [
          {"key": "channels", "type": "channels_table"},
          {"key": "what_worked", "label": "O que funcionou", "type": "text"},
          {"key": "what_to_adjust", "label": "O que ajustar", "type": "text"}
        ]
      },
      {
        "key": "diagnosis",
        "title": "Diagnóstico",
        "required": true,
        "fields": [
          {"key": "what_worked", "label": "O que funcionou (por quê?)", "type": "bullets_with_evidence"},
          {"key": "what_didnt_work", "label": "O que não funcionou (por quê?)", "type": "bullets_with_hypothesis"}
        ]
      },
      {
        "key": "experiments",
        "title": "Experimentos e Recomendações",
        "required": false,
        "fields": [
          {"key": "experiments", "type": "experiments_table"}
        ]
      },
      {
        "key": "action_plan",
        "title": "Plano de Ação",
        "required": true,
        "fields": [
          {"key": "vivaz_tasks", "label": "Da Vivaz", "type": "tasks"},
          {"key": "client_tasks", "label": "Do Cliente", "type": "tasks"}
        ]
      },
      {
        "key": "approvals",
        "title": "Aprovações e Dependências",
        "required": false,
        "fields": [
          {"key": "approval_items", "type": "approval_checklist", "defaults": ["Aprovar orçamento", "Aprovar criativos", "Aprovar landing page", "Aprovar tracking/pixel"]}
        ]
      },
      {
        "key": "notes",
        "title": "Ata / Notas finais",
        "required": false,
        "fields": [
          {"key": "notes", "label": "Notas adicionais", "type": "richtext"},
          {"key": "attachments", "label": "Links e anexos", "type": "attachments"}
        ]
      }
    ],
    "default_kpis": [
      {"key": "investimento", "label": "Investimento", "unit": "R$"},
      {"key": "leads", "label": "Leads", "unit": ""},
      {"key": "cpl", "label": "CPL", "unit": "R$"},
      {"key": "conversoes", "label": "Conversões", "unit": ""},
      {"key": "cpa", "label": "CPA", "unit": "R$"},
      {"key": "roas", "label": "ROAS", "unit": "x"},
      {"key": "receita", "label": "Receita", "unit": "R$"}
    ],
    "default_channels": ["Meta Ads", "Google Ads", "TikTok Ads", "SEO", "E-mail", "Orgânico Social", "Direto", "Outros"],
    "minimum_required_sections": ["executive_summary", "kpis", "action_plan"]
  }'::jsonb
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_meeting_experiments_meeting_id ON public.meeting_experiments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_approval_items_meeting_id ON public.meeting_approval_items(meeting_id);