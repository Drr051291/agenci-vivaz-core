-- Criar bucket para notas fiscais
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false);

-- Criar tabela para rastrear uploads de notas fiscais
CREATE TABLE public.payment_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para buscar notas por payment_id
CREATE INDEX idx_payment_invoices_payment_id ON public.payment_invoices(payment_id);

-- Enable RLS
ALTER TABLE public.payment_invoices ENABLE ROW LEVEL SECURITY;

-- Admins e colaboradores podem ver todas as notas fiscais
CREATE POLICY "Admins e colaboradores podem ver notas fiscais"
ON public.payment_invoices
FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

-- Clientes podem ver notas fiscais dos seus próprios clientes
CREATE POLICY "Clientes podem ver suas próprias notas fiscais"
ON public.payment_invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = payment_invoices.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Admins e colaboradores podem fazer upload de notas fiscais
CREATE POLICY "Admins e colaboradores podem fazer upload de notas fiscais"
ON public.payment_invoices
FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()));

-- Admins e colaboradores podem deletar notas fiscais
CREATE POLICY "Admins e colaboradores podem deletar notas fiscais"
ON public.payment_invoices
FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));

-- Storage policies para o bucket invoices
CREATE POLICY "Admins e colaboradores podem fazer upload de notas fiscais"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' 
  AND is_admin_or_collaborator(auth.uid())
);

CREATE POLICY "Admins e colaboradores podem ver notas fiscais"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'invoices' 
  AND is_admin_or_collaborator(auth.uid())
);

CREATE POLICY "Clientes podem ver suas próprias notas fiscais no storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins e colaboradores podem deletar notas fiscais"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'invoices' 
  AND is_admin_or_collaborator(auth.uid())
);