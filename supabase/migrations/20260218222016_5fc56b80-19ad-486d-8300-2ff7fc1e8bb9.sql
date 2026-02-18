
-- Add campaign_name column to store campaign name for ad-level rows
ALTER TABLE meta_daily_insights
  ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- Clear stale rows with generic entity names so they get re-synced properly
DELETE FROM meta_daily_insights
WHERE entity_name IN ('Campanha', 'ad06') OR entity_id = 'unknown';

NOTIFY pgrst, 'reload schema';
