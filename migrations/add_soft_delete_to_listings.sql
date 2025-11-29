ALTER TABLE watch_listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE cars_listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE housing_listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_watch_listings_deleted ON watch_listings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_cars_listings_deleted ON cars_listings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_housing_listings_deleted ON housing_listings(deleted_at);
