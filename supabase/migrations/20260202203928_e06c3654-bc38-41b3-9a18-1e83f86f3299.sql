-- Create performance_reports table for immutable snapshots
CREATE TABLE public.performance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_label TEXT,
  period_start DATE,
  period_end DATE,
  scenario TEXT NOT NULL CHECK (scenario IN ('conservador', 'realista', 'agressivo')),
  source_tool TEXT NOT NULL DEFAULT 'matriz_performance_pro',
  inputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  benchmarks_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_reports ENABLE ROW LEVEL SECURITY;

-- Admins and collaborators can manage all reports
CREATE POLICY "Admins e colaboradores podem gerenciar relatórios"
  ON public.performance_reports
  FOR ALL
  USING (is_admin_or_collaborator(auth.uid()));

-- Admins and collaborators can view all reports
CREATE POLICY "Admins e colaboradores podem ver relatórios"
  ON public.performance_reports
  FOR SELECT
  USING (is_admin_or_collaborator(auth.uid()));

-- Clients can view their own reports
CREATE POLICY "Clients can view their own performance reports"
  ON public.performance_reports
  FOR SELECT
  USING (
    (client_id = get_user_client_id(auth.uid())) 
    OR is_admin_or_collaborator(auth.uid())
  );

-- Create index for faster client lookups
CREATE INDEX idx_performance_reports_client_id ON public.performance_reports(client_id);
CREATE INDEX idx_performance_reports_created_at ON public.performance_reports(created_at DESC);