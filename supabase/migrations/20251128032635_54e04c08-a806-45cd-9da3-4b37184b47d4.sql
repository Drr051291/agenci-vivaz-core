-- Add better config support to client_dashboards table
-- The config field will store:
-- - reportei_client_id: Selected Reportei project
-- - selected_channels: Array of channel integrations
-- - selected_metrics: Custom metrics per channel
-- - template: Template type (meta_ads, instagram, google_ads, custom)

-- Update the config column to have a better default
ALTER TABLE client_dashboards 
ALTER COLUMN config SET DEFAULT '{
  "reportei_client_id": null,
  "selected_channels": [],
  "selected_metrics": {},
  "template": "custom"
}'::jsonb;

-- Add a comment to document the config structure
COMMENT ON COLUMN client_dashboards.config IS 'Dashboard configuration: reportei_client_id (string), selected_channels (array), selected_metrics (object), template (string: meta_ads|instagram|google_ads|facebook|ecommerce|custom)';
