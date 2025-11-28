-- Create enums for task status and priority
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'review', 'completed', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create meeting_minutes table
CREATE TABLE public.meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  participants TEXT[],
  content TEXT NOT NULL,
  action_items TEXT[],
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'pending',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client_dashboards table
CREATE TABLE public.client_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dashboard_type TEXT NOT NULL,
  embed_url TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_dashboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_minutes
CREATE POLICY "Admins e colaboradores podem ver todas as atas"
  ON public.meeting_minutes
  FOR SELECT
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver suas próprias atas"
  ON public.meeting_minutes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = meeting_minutes.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins e colaboradores podem inserir atas"
  ON public.meeting_minutes
  FOR INSERT
  WITH CHECK (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar atas"
  ON public.meeting_minutes
  FOR UPDATE
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar atas"
  ON public.meeting_minutes
  FOR DELETE
  USING (public.is_admin_or_collaborator(auth.uid()));

-- RLS Policies for tasks
CREATE POLICY "Admins e colaboradores podem ver todas as tasks"
  ON public.tasks
  FOR SELECT
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver suas próprias tasks"
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = tasks.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem ver tasks atribuídas a eles"
  ON public.tasks
  FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "Admins e colaboradores podem inserir tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar tasks"
  ON public.tasks
  FOR UPDATE
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Usuários atribuídos podem atualizar status da task"
  ON public.tasks
  FOR UPDATE
  USING (assigned_to = auth.uid());

CREATE POLICY "Admins e colaboradores podem deletar tasks"
  ON public.tasks
  FOR DELETE
  USING (public.is_admin_or_collaborator(auth.uid()));

-- RLS Policies for client_dashboards
CREATE POLICY "Admins e colaboradores podem ver todos os dashboards"
  ON public.client_dashboards
  FOR SELECT
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver seus próprios dashboards"
  ON public.client_dashboards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_dashboards.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins e colaboradores podem inserir dashboards"
  ON public.client_dashboards
  FOR INSERT
  WITH CHECK (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar dashboards"
  ON public.client_dashboards
  FOR UPDATE
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar dashboards"
  ON public.client_dashboards
  FOR DELETE
  USING (public.is_admin_or_collaborator(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_meeting_minutes_updated_at
  BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_dashboards_updated_at
  BEFORE UPDATE ON public.client_dashboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();