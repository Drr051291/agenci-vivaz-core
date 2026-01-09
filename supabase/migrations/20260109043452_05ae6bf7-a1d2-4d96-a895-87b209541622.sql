-- Create table for Performance Matrix Pro diagnostics
CREATE TABLE public.performance_matrix_diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.clients(id),
  name VARCHAR(255) NOT NULL,
  setor VARCHAR(50) NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}',
  outputs JSONB NOT NULL DEFAULT '{}',
  insights JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_matrix_diagnostics ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Users can view their own diagnostics"
ON public.performance_matrix_diagnostics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diagnostics"
ON public.performance_matrix_diagnostics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diagnostics"
ON public.performance_matrix_diagnostics
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diagnostics"
ON public.performance_matrix_diagnostics
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_performance_matrix_diagnostics_updated_at
BEFORE UPDATE ON public.performance_matrix_diagnostics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();