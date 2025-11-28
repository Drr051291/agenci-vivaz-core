-- Criar enum para segmentos de cliente
CREATE TYPE public.client_segment AS ENUM (
  'inside_sales',
  'ecommerce', 
  'marketplace',
  'local_business'
);

-- Adicionar novos campos na tabela clients
ALTER TABLE public.clients
  ADD COLUMN segment public.client_segment NOT NULL DEFAULT 'local_business',
  ADD COLUMN contract_start DATE,
  ADD COLUMN monthly_fee NUMERIC(10,2),
  ADD COLUMN contact_name TEXT,
  ADD COLUMN contact_phone TEXT,
  ADD COLUMN contact_email TEXT;

-- Tornar project_id opcional nas tabelas tasks e meeting_minutes
ALTER TABLE public.tasks
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.meeting_minutes
  ALTER COLUMN project_id DROP NOT NULL;