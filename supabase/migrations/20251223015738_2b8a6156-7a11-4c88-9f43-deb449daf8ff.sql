-- Create table for DRE simulations
CREATE TABLE public.dre_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Basic info
  name TEXT NOT NULL,
  base_month DATE NOT NULL,
  horizon_months INTEGER NOT NULL DEFAULT 12,
  model TEXT NOT NULL CHECK (model IN ('INVEST_TO_REV', 'REV_GROWTH')),
  
  -- Base month inputs
  receita_base NUMERIC NOT NULL DEFAULT 0,
  pedidos_base NUMERIC NOT NULL DEFAULT 0,
  cmv_base NUMERIC NOT NULL DEFAULT 0,
  frete_base NUMERIC NOT NULL DEFAULT 0,
  investimento_base NUMERIC NOT NULL DEFAULT 0,
  comissao_base NUMERIC NOT NULL DEFAULT 0,
  custos_fixos_base NUMERIC NOT NULL DEFAULT 0,
  imposto_pct NUMERIC NOT NULL DEFAULT 10,
  
  -- Growth parameters
  g_mkt NUMERIC NOT NULL DEFAULT 0,
  d_roas NUMERIC NOT NULL DEFAULT 0,
  g_rev NUMERIC NOT NULL DEFAULT 0,
  g_ticket NUMERIC NOT NULL DEFAULT 0,
  g_fix NUMERIC NOT NULL DEFAULT 0,
  retorno_pct NUMERIC NOT NULL DEFAULT 0,
  
  -- Scaling options
  cmv_scaling TEXT NOT NULL DEFAULT 'pedidos' CHECK (cmv_scaling IN ('pedidos', 'receita')),
  frete_scaling TEXT NOT NULL DEFAULT 'pedidos' CHECK (frete_scaling IN ('pedidos', 'receita')),
  comissao_scaling TEXT NOT NULL DEFAULT 'receita' CHECK (comissao_scaling IN ('receita', 'fixo')),
  
  -- Advanced thresholds
  margem_minima NUMERIC DEFAULT NULL,
  roas_minimo NUMERIC DEFAULT NULL,
  ebitda_minimo NUMERIC DEFAULT NULL,
  
  -- Cached projection data
  projection_json JSONB DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.dre_simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own simulations
CREATE POLICY "Users can view their own DRE simulations"
ON public.dre_simulations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own DRE simulations"
ON public.dre_simulations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DRE simulations"
ON public.dre_simulations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own DRE simulations"
ON public.dre_simulations
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_dre_simulations_updated_at
BEFORE UPDATE ON public.dre_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();