-- Create projections table for storing revenue projection calculations
CREATE TABLE public.projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('ecommerce', 'whatsapp')),
  mode text NOT NULL CHECK (mode IN ('target_to_budget', 'budget_to_projection')),
  period_label text,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projections ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins and collaborators can manage projections
CREATE POLICY "Admins e colaboradores podem ver projeções"
ON public.projections FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem criar projeções"
ON public.projections FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar projeções"
ON public.projections FOR UPDATE
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar projeções"
ON public.projections FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_projections_updated_at
BEFORE UPDATE ON public.projections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();