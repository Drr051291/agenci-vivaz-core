-- Create enum for meeting status
CREATE TYPE public.meeting_status AS ENUM ('rascunho', 'em_revisao', 'aprovado');

-- Create enum for task owner type
CREATE TYPE public.task_owner_type AS ENUM ('vivaz', 'cliente');

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Meeting templates table
CREATE TABLE public.meeting_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'FileText',
  template_type TEXT NOT NULL DEFAULT 'performance',
  schema_json JSONB DEFAULT '[]'::jsonb,
  estimated_time_min INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to meeting_minutes for structured approach
ALTER TABLE public.meeting_minutes 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.meeting_templates(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'rascunho',
ADD COLUMN IF NOT EXISTS duration_min INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS analysis_period_start DATE,
ADD COLUMN IF NOT EXISTS analysis_period_end DATE,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Meeting sections table (structured content blocks)
CREATE TABLE public.meeting_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting metrics table (structured metrics with targets)
CREATE TABLE public.meeting_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_label TEXT NOT NULL,
  target_value NUMERIC,
  actual_value NUMERIC,
  unit TEXT DEFAULT '',
  variation_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN target_value IS NOT NULL AND target_value != 0 
      THEN ROUND(((actual_value - target_value) / target_value * 100)::numeric, 2)
      ELSE NULL 
    END
  ) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting channels table (performance by channel)
CREATE TABLE public.meeting_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  investment NUMERIC DEFAULT 0,
  impressions NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  leads NUMERIC DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  cpl NUMERIC GENERATED ALWAYS AS (
    CASE WHEN leads IS NOT NULL AND leads > 0 
      THEN ROUND((investment / leads)::numeric, 2)
      ELSE NULL 
    END
  ) STORED,
  cpa NUMERIC GENERATED ALWAYS AS (
    CASE WHEN conversions IS NOT NULL AND conversions > 0 
      THEN ROUND((investment / conversions)::numeric, 2)
      ELSE NULL 
    END
  ) STORED,
  roas NUMERIC GENERATED ALWAYS AS (
    CASE WHEN investment IS NOT NULL AND investment > 0 
      THEN ROUND((revenue / investment)::numeric, 2)
      ELSE NULL 
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting participants table
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  is_client BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting approvals table
CREATE TABLE public.meeting_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Meeting files table
CREATE TABLE public.meeting_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_templates (all authenticated can view, only admins can manage)
CREATE POLICY "Todos autenticados podem ver templates"
ON public.meeting_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar templates"
ON public.meeting_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for meeting_sections
CREATE POLICY "Admins e colaboradores podem ver seções"
ON public.meeting_sections FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem gerenciar seções"
ON public.meeting_sections FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver seções de suas reuniões aprovadas"
ON public.meeting_sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    JOIN clients c ON c.id = mm.client_id
    WHERE mm.id = meeting_sections.meeting_id
    AND c.user_id = auth.uid()
    AND mm.status = 'aprovado'
  )
);

-- RLS policies for meeting_metrics
CREATE POLICY "Admins e colaboradores podem ver métricas"
ON public.meeting_metrics FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem gerenciar métricas"
ON public.meeting_metrics FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver métricas de suas reuniões aprovadas"
ON public.meeting_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    JOIN clients c ON c.id = mm.client_id
    WHERE mm.id = meeting_metrics.meeting_id
    AND c.user_id = auth.uid()
    AND mm.status = 'aprovado'
  )
);

-- RLS policies for meeting_channels
CREATE POLICY "Admins e colaboradores podem ver canais"
ON public.meeting_channels FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem gerenciar canais"
ON public.meeting_channels FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver canais de suas reuniões aprovadas"
ON public.meeting_channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    JOIN clients c ON c.id = mm.client_id
    WHERE mm.id = meeting_channels.meeting_id
    AND c.user_id = auth.uid()
    AND mm.status = 'aprovado'
  )
);

-- RLS policies for meeting_participants
CREATE POLICY "Admins e colaboradores podem ver participantes"
ON public.meeting_participants FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem gerenciar participantes"
ON public.meeting_participants FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver participantes de suas reuniões"
ON public.meeting_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    JOIN clients c ON c.id = mm.client_id
    WHERE mm.id = meeting_participants.meeting_id
    AND c.user_id = auth.uid()
  )
);

-- RLS policies for meeting_approvals
CREATE POLICY "Admins e colaboradores podem ver aprovações"
ON public.meeting_approvals FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem gerenciar aprovações"
ON public.meeting_approvals FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

-- RLS policies for meeting_files
CREATE POLICY "Admins e colaboradores podem ver arquivos"
ON public.meeting_files FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem gerenciar arquivos"
ON public.meeting_files FOR ALL
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver arquivos de suas reuniões aprovadas"
ON public.meeting_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    JOIN clients c ON c.id = mm.client_id
    WHERE mm.id = meeting_files.meeting_id
    AND c.user_id = auth.uid()
    AND mm.status = 'aprovado'
  )
);

-- Add owner_type column to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'vivaz';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_sections_meeting_id ON public.meeting_sections(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_metrics_meeting_id ON public.meeting_metrics(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_channels_meeting_id ON public.meeting_channels(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_approvals_meeting_id ON public.meeting_approvals(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_files_meeting_id ON public.meeting_files(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_status ON public.meeting_minutes(status);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_client_date ON public.meeting_minutes(client_id, meeting_date DESC);

-- Insert default templates
INSERT INTO public.meeting_templates (name, description, icon, template_type, estimated_time_min, schema_json) VALUES
(
  'Reunião de Performance',
  'Análise completa de métricas, insights e plano de ação para clientes de mídia paga',
  'BarChart3',
  'performance',
  45,
  '[
    {"key": "abertura", "title": "Abertura e Alinhamento", "type": "text"},
    {"key": "resumo", "title": "Resumo Executivo", "type": "bullets", "maxItems": 3},
    {"key": "metricas", "title": "Métricas Principais", "type": "metrics"},
    {"key": "canais", "title": "Desempenho por Canal", "type": "channels"},
    {"key": "insights", "title": "Insights", "type": "insights"},
    {"key": "funcionou", "title": "O Que Funcionou Bem", "type": "bullets"},
    {"key": "melhorias", "title": "Pontos de Melhoria", "type": "bullets"},
    {"key": "acoes_realizadas", "title": "Ações Realizadas", "type": "bullets"},
    {"key": "plano_acao", "title": "Plano de Ação", "type": "tasks"},
    {"key": "recomendacoes", "title": "Recomendações Estratégicas", "type": "text"},
    {"key": "aprovacoes", "title": "Aprovações Necessárias", "type": "checklist"},
    {"key": "duvidas", "title": "Dúvidas e Discussões", "type": "text"}
  ]'::jsonb
),
(
  'Kickoff de Projeto',
  'Alinhamento inicial de objetivos, escopo, cronograma e stakeholders',
  'Rocket',
  'kickoff',
  60,
  '[
    {"key": "objetivos", "title": "Objetivos do Projeto", "type": "bullets"},
    {"key": "escopo", "title": "Escopo e Entregas", "type": "text"},
    {"key": "cronograma", "title": "Cronograma", "type": "text"},
    {"key": "stakeholders", "title": "Stakeholders e Responsabilidades", "type": "text"},
    {"key": "riscos", "title": "Riscos e Mitigações", "type": "bullets"},
    {"key": "proximos_passos", "title": "Próximos Passos", "type": "tasks"},
    {"key": "duvidas", "title": "Dúvidas e Alinhamentos", "type": "text"}
  ]'::jsonb
),
(
  'Reunião Simples',
  'Pauta básica com decisões e próximos passos',
  'FileText',
  'simple',
  30,
  '[
    {"key": "pauta", "title": "Pauta", "type": "bullets"},
    {"key": "discussao", "title": "Discussão", "type": "text"},
    {"key": "decisoes", "title": "Decisões", "type": "bullets"},
    {"key": "proximos_passos", "title": "Próximos Passos", "type": "tasks"}
  ]'::jsonb
);

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_meeting_sections_updated_at
BEFORE UPDATE ON public.meeting_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_templates_updated_at
BEFORE UPDATE ON public.meeting_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();