-- Create table for ML pricing simulations
CREATE TABLE public.ml_pricing_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  name text NOT NULL,
  sku text,
  listing_type text NOT NULL CHECK (listing_type IN ('CLASSICO', 'PREMIUM')),
  product_condition text CHECK (product_condition IN ('NOVO', 'USADO')),
  has_free_shipping boolean DEFAULT false NOT NULL,
  mode text NOT NULL CHECK (mode IN ('PRICE_TO_RESULT', 'TARGET_TO_PRICE')),
  target_type text CHECK (target_type IN ('MARGIN', 'PROFIT')),
  target_value numeric,
  sale_price numeric,
  cogs numeric NOT NULL DEFAULT 0,
  commission_pct numeric NOT NULL DEFAULT 0,
  fixed_fee numeric NOT NULL DEFAULT 0,
  tax_pct numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  packaging_cost numeric NOT NULL DEFAULT 0,
  platform_cost numeric NOT NULL DEFAULT 0,
  ads_cost numeric NOT NULL DEFAULT 0,
  other_cost numeric NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.ml_pricing_simulations ENABLE ROW LEVEL SECURITY;

-- User can only see their own simulations
CREATE POLICY "Users can view their own simulations"
ON public.ml_pricing_simulations
FOR SELECT
USING (auth.uid() = user_id);

-- User can insert their own simulations
CREATE POLICY "Users can insert their own simulations"
ON public.ml_pricing_simulations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User can update their own simulations
CREATE POLICY "Users can update their own simulations"
ON public.ml_pricing_simulations
FOR UPDATE
USING (auth.uid() = user_id);

-- User can delete their own simulations
CREATE POLICY "Users can delete their own simulations"
ON public.ml_pricing_simulations
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_ml_pricing_simulations_updated_at
BEFORE UPDATE ON public.ml_pricing_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();