-- Add tool_type column to performance_matrix_diagnostics to support multiple tool types
ALTER TABLE public.performance_matrix_diagnostics 
ADD COLUMN IF NOT EXISTS tool_type text NOT NULL DEFAULT 'performance_pro';

-- Add simulation_data column for storing simulator scenarios
ALTER TABLE public.performance_matrix_diagnostics 
ADD COLUMN IF NOT EXISTS simulation_data jsonb DEFAULT NULL;

-- Add period_label for date context
ALTER TABLE public.performance_matrix_diagnostics 
ADD COLUMN IF NOT EXISTS period_label text DEFAULT NULL;

-- Add status for quick filtering
ALTER TABLE public.performance_matrix_diagnostics 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Add notes for additional context
ALTER TABLE public.performance_matrix_diagnostics 
ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

-- Update RLS policy to allow clients to view their diagnostics
DROP POLICY IF EXISTS "Clients can view their own diagnostics" ON public.performance_matrix_diagnostics;

CREATE POLICY "Clients can view their own diagnostics"
ON public.performance_matrix_diagnostics
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Create index for faster client queries
CREATE INDEX IF NOT EXISTS idx_performance_matrix_diagnostics_client_tool 
ON public.performance_matrix_diagnostics(client_id, tool_type);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_performance_matrix_diagnostics_status 
ON public.performance_matrix_diagnostics(status);