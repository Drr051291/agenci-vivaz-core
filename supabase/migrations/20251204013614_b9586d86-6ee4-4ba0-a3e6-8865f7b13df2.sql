-- Alterar a coluna status de enum para texto para suportar status customizados por categoria
ALTER TABLE public.tasks 
ALTER COLUMN status DROP DEFAULT,
ALTER COLUMN status TYPE text USING status::text,
ALTER COLUMN status SET DEFAULT 'pending';