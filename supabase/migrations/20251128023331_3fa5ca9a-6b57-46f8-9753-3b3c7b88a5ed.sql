-- Criar bucket para imagens das atas
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-minutes', 'meeting-minutes', true);

-- Políticas de acesso para o bucket de atas
CREATE POLICY "Admins e colaboradores podem ver imagens de atas"
ON storage.objects FOR SELECT
USING (bucket_id = 'meeting-minutes' AND is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem fazer upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'meeting-minutes' AND is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar imagens de atas"
ON storage.objects FOR DELETE
USING (bucket_id = 'meeting-minutes' AND is_admin_or_collaborator(auth.uid()));