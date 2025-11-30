-- Adicionar campo category à tabela tasks
ALTER TABLE public.tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'outros';

-- Criar comentários de atividades
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para task_comments
CREATE POLICY "Admins e colaboradores podem ver todos os comentários"
ON public.task_comments
FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Clientes podem ver comentários de suas tasks"
ON public.task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    JOIN public.clients ON clients.id = tasks.client_id
    WHERE tasks.id = task_comments.task_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Admins e colaboradores podem inserir comentários"
ON public.task_comments
FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Clientes podem inserir comentários em suas tasks"
ON public.task_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    JOIN public.clients ON clients.id = tasks.client_id
    WHERE tasks.id = task_comments.task_id 
    AND clients.user_id = auth.uid()
  )
  AND auth.uid() = user_id
);

CREATE POLICY "Usuários podem deletar seus próprios comentários"
ON public.task_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Permitir clientes atualizarem status de suas próprias tasks
CREATE POLICY "Clientes podem atualizar status de suas tasks"
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = tasks.client_id 
    AND clients.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = tasks.client_id 
    AND clients.user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at em task_comments
CREATE TRIGGER update_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();