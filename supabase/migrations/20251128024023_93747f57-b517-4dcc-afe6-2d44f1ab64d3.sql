-- Adicionar campo share_token para compartilhamento público
ALTER TABLE meeting_minutes
ADD COLUMN share_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Criar índice para performance
CREATE INDEX idx_meeting_minutes_share_token ON meeting_minutes(share_token);

-- Política RLS para permitir acesso público via share_token
CREATE POLICY "Atas podem ser vistas publicamente via token de compartilhamento"
ON meeting_minutes FOR SELECT
USING (share_token IS NOT NULL);