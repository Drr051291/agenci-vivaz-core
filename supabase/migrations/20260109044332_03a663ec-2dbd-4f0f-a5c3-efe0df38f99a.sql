-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create ai_knowledge_base table for storing client context
CREATE TABLE public.ai_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url', 'system_metric', 'meeting')),
  source_name TEXT NOT NULL,
  source_reference TEXT, -- file path, URL, or reference ID
  content_text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embedding dimension
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_chat_sessions table for storing chat history
CREATE TABLE public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  title TEXT DEFAULT 'Nova Conversa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_chat_messages table for storing individual messages
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]', -- Array of source references used
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_ai_knowledge_base_client_id ON public.ai_knowledge_base(client_id);
CREATE INDEX idx_ai_knowledge_base_source_type ON public.ai_knowledge_base(source_type);
CREATE INDEX idx_ai_knowledge_base_active ON public.ai_knowledge_base(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_chat_sessions_client_id ON public.ai_chat_sessions(client_id);
CREATE INDEX idx_ai_chat_messages_session_id ON public.ai_chat_messages(session_id);

-- Enable RLS
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_knowledge_base (admins and collaborators can manage)
CREATE POLICY "Admins and collaborators can view knowledge base"
ON public.ai_knowledge_base FOR SELECT
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins and collaborators can create knowledge base entries"
ON public.ai_knowledge_base FOR INSERT
WITH CHECK (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins and collaborators can update knowledge base"
ON public.ai_knowledge_base FOR UPDATE
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins and collaborators can delete knowledge base entries"
ON public.ai_knowledge_base FOR DELETE
USING (public.is_admin_or_collaborator(auth.uid()));

-- RLS Policies for ai_chat_sessions
CREATE POLICY "Admins and collaborators can view chat sessions"
ON public.ai_chat_sessions FOR SELECT
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins and collaborators can create chat sessions"
ON public.ai_chat_sessions FOR INSERT
WITH CHECK (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins and collaborators can update chat sessions"
ON public.ai_chat_sessions FOR UPDATE
USING (public.is_admin_or_collaborator(auth.uid()));

CREATE POLICY "Admins and collaborators can delete chat sessions"
ON public.ai_chat_sessions FOR DELETE
USING (public.is_admin_or_collaborator(auth.uid()));

-- RLS Policies for ai_chat_messages
CREATE POLICY "Admins and collaborators can view chat messages"
ON public.ai_chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ai_chat_sessions s 
  WHERE s.id = session_id AND public.is_admin_or_collaborator(auth.uid())
));

CREATE POLICY "Admins and collaborators can create chat messages"
ON public.ai_chat_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ai_chat_sessions s 
  WHERE s.id = session_id AND public.is_admin_or_collaborator(auth.uid())
));

-- Triggers for updated_at
CREATE TRIGGER update_ai_knowledge_base_updated_at
BEFORE UPDATE ON public.ai_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_chat_sessions_updated_at
BEFORE UPDATE ON public.ai_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();