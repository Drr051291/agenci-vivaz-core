-- Add sales_channels column to clients table (array of text for multiple channels)
ALTER TABLE public.clients 
ADD COLUMN sales_channels text[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN public.clients.sales_channels IS 'Canais de venda ou serviços contratados pelo cliente (ex: ecommerce, marketplace, social_commerce, local_business, inside_sales)';