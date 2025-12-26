-- Adicionar policy para permitir exclusão de clientes por admins e colaboradores
CREATE POLICY "Admins e colaboradores podem deletar clientes"
ON public.clients
FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));