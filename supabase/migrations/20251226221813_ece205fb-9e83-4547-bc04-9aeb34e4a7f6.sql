-- Alterar coluna segment de enum para texto para permitir mais segmentos
ALTER TABLE public.clients 
  ALTER COLUMN segment TYPE text USING segment::text;

-- Definir valor padrão
ALTER TABLE public.clients 
  ALTER COLUMN segment SET DEFAULT 'outro';

-- Remover o enum antigo se não estiver sendo usado em outro lugar
-- DROP TYPE IF EXISTS client_segment;