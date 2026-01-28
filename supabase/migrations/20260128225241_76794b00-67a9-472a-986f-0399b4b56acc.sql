-- Criar tabela de junção para permitir múltiplos usuários por cliente
CREATE TABLE public.client_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Enable RLS
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (usando a assinatura correta das funções existentes)
CREATE POLICY "Admins and collaborators can view all client_users"
ON public.client_users
FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins can manage client_users"
ON public.client_users
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own links"
ON public.client_users
FOR SELECT
USING (auth.uid() = user_id);

-- Migrar dados existentes: copiar vínculos atuais da coluna user_id
INSERT INTO public.client_users (client_id, user_id)
SELECT id, user_id FROM public.clients WHERE user_id IS NOT NULL
ON CONFLICT (client_id, user_id) DO NOTHING;

-- Atualizar a função get_user_client_id para usar a nova tabela
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_users 
  WHERE user_id = _user_id 
  LIMIT 1;
$$;