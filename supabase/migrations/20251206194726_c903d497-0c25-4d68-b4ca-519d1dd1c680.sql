-- Adicionar campo para Ad Account ID do Meta Ads na configuração do Dashboard Vivaz
ALTER TABLE public.vivaz_dashboard_config 
ADD COLUMN meta_ad_account_id text,
ADD COLUMN google_ads_account_id text,
ADD COLUMN ga4_property_id text;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.vivaz_dashboard_config.meta_ad_account_id IS 'ID da conta de anúncios do Meta Ads (act_XXXXX)';
COMMENT ON COLUMN public.vivaz_dashboard_config.google_ads_account_id IS 'ID da conta do Google Ads';
COMMENT ON COLUMN public.vivaz_dashboard_config.ga4_property_id IS 'ID da propriedade do GA4';