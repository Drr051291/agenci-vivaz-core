-- Atualizar a função handle_new_user para dar role de admin automaticamente 
-- para o email contato@vivazagencia.com.br
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role app_role;
BEGIN
  -- Se for o email do admin master, sempre dar role de admin
  IF NEW.email = 'contato@vivazagencia.com.br' THEN
    _role := 'admin'::app_role;
  ELSE
    -- Caso contrário, usar role do metadata ou 'client' como padrão
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client'::app_role);
  END IF;
  
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