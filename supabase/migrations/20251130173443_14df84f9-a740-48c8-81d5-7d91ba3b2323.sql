-- Create tables for Google Calendar integration

-- Tabela para armazenar tokens OAuth do Google
CREATE TABLE google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamp with time zone,
  calendar_id text DEFAULT 'primary',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_calendar_tokens
CREATE POLICY "Usuários podem ver seus próprios tokens"
ON google_calendar_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios tokens"
ON google_calendar_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios tokens"
ON google_calendar_tokens
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios tokens"
ON google_calendar_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Tabela para vincular eventos do Google a reuniões do Hub
CREATE TABLE google_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meeting_minutes(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  calendar_id text NOT NULL,
  synced_at timestamp with time zone DEFAULT now(),
  UNIQUE(meeting_id)
);

-- Enable RLS
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_calendar_events
CREATE POLICY "Admins e colaboradores podem ver todos os vínculos de eventos"
ON google_calendar_events
FOR SELECT
USING (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem inserir vínculos de eventos"
ON google_calendar_events
FOR INSERT
WITH CHECK (is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins e colaboradores podem deletar vínculos de eventos"
ON google_calendar_events
FOR DELETE
USING (is_admin_or_collaborator(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_google_calendar_tokens_updated_at
BEFORE UPDATE ON google_calendar_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();