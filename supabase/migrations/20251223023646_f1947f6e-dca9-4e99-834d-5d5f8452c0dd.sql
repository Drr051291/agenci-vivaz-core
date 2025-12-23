-- Tabela para diagnósticos de funil e-commerce
CREATE TABLE public.ecommerce_diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Identificação
  name TEXT NOT NULL,
  period_label TEXT,
  
  -- Inputs de tráfego
  ctr_facebook NUMERIC DEFAULT 0,
  cpc_facebook NUMERIC DEFAULT 0,
  invest_facebook NUMERIC DEFAULT 0,
  ctr_google NUMERIC DEFAULT 0,
  cpc_google NUMERIC DEFAULT 0,
  invest_google NUMERIC DEFAULT 0,
  
  -- Inputs de funil
  visitantes INTEGER DEFAULT 0,
  carrinhos INTEGER DEFAULT 0,
  compras INTEGER DEFAULT 0,
  vendas_pagas INTEGER DEFAULT 0,
  ticket_medio NUMERIC DEFAULT 0,
  
  -- Computed / cached
  faturamento NUMERIC DEFAULT 0,
  roas NUMERIC,
  
  -- Taxas calculadas
  taxa_visitante_carrinho NUMERIC,
  taxa_carrinho_compra NUMERIC,
  taxa_compra_pagamento NUMERIC,
  
  -- Diagnóstico (JSON com falhas identificadas por etapa)
  diagnostico_json JSONB DEFAULT '{}'::jsonb,
  
  -- Status por etapa (ok, atencao, critico)
  status_trafego TEXT,
  status_visitante_carrinho TEXT,
  status_carrinho_compra TEXT,
  status_compra_pagamento TEXT
);

-- Enable RLS
ALTER TABLE public.ecommerce_diagnostics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own ecommerce diagnostics"
  ON public.ecommerce_diagnostics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ecommerce diagnostics"
  ON public.ecommerce_diagnostics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ecommerce diagnostics"
  ON public.ecommerce_diagnostics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ecommerce diagnostics"
  ON public.ecommerce_diagnostics FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_ecommerce_diagnostics_updated_at
  BEFORE UPDATE ON public.ecommerce_diagnostics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();