-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'collaborator', 'client');

-- Criar tabela de roles separada para evitar recursão
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para verificar roles (evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é admin ou colaborador
CREATE OR REPLACE FUNCTION public.is_admin_or_collaborator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'collaborator')
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver suas próprias roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem inserir roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Dropar políticas antigas do profiles que causam recursão
DROP POLICY IF EXISTS "Admins e colaboradores podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Novos usuários podem inserir seu perfil" ON public.profiles;

-- Novas políticas para profiles usando as funções security definer
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins e colaboradores podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins podem inserir perfis"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode inserir perfil no registro"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Dropar políticas antigas de clients que causam recursão
DROP POLICY IF EXISTS "Clientes podem ver seus próprios dados" ON public.clients;
DROP POLICY IF EXISTS "Admins e colaboradores podem inserir clientes" ON public.clients;
DROP POLICY IF EXISTS "Admins e colaboradores podem atualizar clientes" ON public.clients;

-- Novas políticas para clients
CREATE POLICY "Clientes podem ver seus próprios dados"
  ON public.clients FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.is_admin_or_collaborator(auth.uid())
  );

CREATE POLICY "Admins e colaboradores podem inserir clientes"
  ON public.clients FOR INSERT
  WITH CHECK (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar clientes"
  ON public.clients FOR UPDATE
  USING (public.is_admin_or_collaborator(auth.uid()));

-- Dropar políticas antigas de projects
DROP POLICY IF EXISTS "Admins e colaboradores podem inserir projetos" ON public.projects;
DROP POLICY IF EXISTS "Admins e colaboradores podem atualizar projetos" ON public.projects;
DROP POLICY IF EXISTS "Ver projetos relacionados" ON public.projects;

-- Novas políticas para projects
CREATE POLICY "Ver projetos relacionados"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = projects.client_id
      AND (
        clients.user_id = auth.uid() OR
        public.is_admin_or_collaborator(auth.uid())
      )
    )
  );

CREATE POLICY "Admins e colaboradores podem inserir projetos"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem atualizar projetos"
  ON public.projects FOR UPDATE
  USING (public.is_admin_or_collaborator(auth.uid()));

-- Atualizar função handle_new_user para adicionar role na tabela user_roles
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role app_role;
BEGIN
  -- Determinar role do metadata ou usar 'client' como padrão
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client'::app_role);
  
  -- Inserir perfil
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email,
    _role::text
  );
  
  -- Inserir role na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();