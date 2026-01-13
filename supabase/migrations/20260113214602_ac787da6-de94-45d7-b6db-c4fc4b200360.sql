-- Add new columns to ai_knowledge_base for file support
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES profiles(id);

-- Add new columns to ai_chat_sessions for better tracking
ALTER TABLE ai_chat_sessions ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();
ALTER TABLE ai_chat_sessions ADD COLUMN IF NOT EXISTS message_count integer DEFAULT 0;
ALTER TABLE ai_chat_sessions ADD COLUMN IF NOT EXISTS context_summary text;

-- Create storage bucket for AI knowledge files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-knowledge-files',
  'ai-knowledge-files',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for ai-knowledge-files bucket
CREATE POLICY "Admins e colaboradores podem fazer upload de arquivos KB"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ai-knowledge-files' 
  AND is_admin_or_collaborator(auth.uid())
);

CREATE POLICY "Admins e colaboradores podem ver arquivos KB"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ai-knowledge-files' 
  AND is_admin_or_collaborator(auth.uid())
);

CREATE POLICY "Admins e colaboradores podem deletar arquivos KB"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ai-knowledge-files' 
  AND is_admin_or_collaborator(auth.uid())
);

-- Function to update message count and last_message_at
CREATE OR REPLACE FUNCTION update_chat_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_chat_sessions
  SET 
    message_count = (SELECT COUNT(*) FROM ai_chat_messages WHERE session_id = NEW.session_id),
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update session stats on new message
DROP TRIGGER IF EXISTS update_session_stats_trigger ON ai_chat_messages;
CREATE TRIGGER update_session_stats_trigger
AFTER INSERT ON ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_session_stats();

-- Add RLS policy for clients to view their own knowledge base entries
CREATE POLICY "Clients can view their own knowledge base"
ON ai_knowledge_base FOR SELECT
USING (
  client_id = get_user_client_id(auth.uid()) 
  OR is_admin_or_collaborator(auth.uid())
);

-- Add RLS policies for clients to access their own chat sessions
CREATE POLICY "Clients can view their own chat sessions"
ON ai_chat_sessions FOR SELECT
USING (
  client_id = get_user_client_id(auth.uid()) 
  OR is_admin_or_collaborator(auth.uid())
);

CREATE POLICY "Clients can create their own chat sessions"
ON ai_chat_sessions FOR INSERT
WITH CHECK (
  client_id = get_user_client_id(auth.uid()) 
  OR is_admin_or_collaborator(auth.uid())
);

CREATE POLICY "Clients can update their own chat sessions"
ON ai_chat_sessions FOR UPDATE
USING (
  client_id = get_user_client_id(auth.uid()) 
  OR is_admin_or_collaborator(auth.uid())
);

-- Add RLS policies for clients to access their own chat messages
CREATE POLICY "Clients can view their own chat messages"
ON ai_chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_chat_sessions s
    WHERE s.id = ai_chat_messages.session_id
    AND (s.client_id = get_user_client_id(auth.uid()) OR is_admin_or_collaborator(auth.uid()))
  )
);

CREATE POLICY "Clients can create their own chat messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_chat_sessions s
    WHERE s.id = ai_chat_messages.session_id
    AND (s.client_id = get_user_client_id(auth.uid()) OR is_admin_or_collaborator(auth.uid()))
  )
);