-- Create table for storing simulation scenarios from Performance Matrix Pro
CREATE TABLE public.performance_simulation_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  setor TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}',
  simulated_rates JSONB NOT NULL DEFAULT '{}',
  current_results JSONB NOT NULL DEFAULT '{}',
  simulated_results JSONB NOT NULL DEFAULT '{}',
  benchmark_data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_simulation_scenarios ENABLE ROW LEVEL SECURITY;

-- Policies for admin/collaborator (full access)
CREATE POLICY "Admins and collaborators can manage all scenarios"
ON public.performance_simulation_scenarios
FOR ALL
USING (public.is_admin_or_collaborator(auth.uid()));

-- Policy for clients (read-only, only their own scenarios)
CREATE POLICY "Clients can view their own scenarios"
ON public.performance_simulation_scenarios
FOR SELECT
USING (
  public.has_role(auth.uid(), 'client') 
  AND client_id = public.get_user_client_id(auth.uid())
);

-- Add updated_at trigger
CREATE TRIGGER update_performance_simulation_scenarios_updated_at
BEFORE UPDATE ON public.performance_simulation_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster client lookups
CREATE INDEX idx_performance_simulation_scenarios_client_id 
ON public.performance_simulation_scenarios(client_id);

-- Add comment for documentation
COMMENT ON TABLE public.performance_simulation_scenarios IS 'Stores "What if?" simulation scenarios from Performance Matrix Pro tool';