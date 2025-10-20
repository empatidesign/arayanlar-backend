-- Housing listings tablosundaki mevcut onaylanmış ilanların expires_at değerlerini güncelle
-- Migration: Update existing approved housing listings expires_at
-- Date: 2025-01-20

BEGIN;

-- Onaylanmış ilanların expires_at değerini created_at + 7 gün olarak güncelle
UPDATE housing_listings 
SET expires_at = created_at + INTERVAL '7 days'
WHERE status = 'approved';

-- Housing listings tablosunun default expires_at değerini 7 güne güncelle
ALTER TABLE housing_listings 
ALTER COLUMN expires_at SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days');

-- Yorum güncelle
COMMENT ON COLUMN housing_listings.expires_at IS 'İlanın bitiş tarihi - default 7 gün';

COMMIT;