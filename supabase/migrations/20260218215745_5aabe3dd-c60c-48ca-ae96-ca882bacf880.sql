
ALTER TABLE meta_daily_insights
  DROP CONSTRAINT IF EXISTS meta_daily_insights_level_check;

ALTER TABLE meta_daily_insights
  ADD CONSTRAINT meta_daily_insights_level_check
  CHECK (level IN ('account', 'campaign', 'ad', 'adset'));
