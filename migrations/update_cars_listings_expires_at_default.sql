-- Araba ilanları tablosundaki expires_at default değerini 7 güne güncelle
-- Migration: Update cars_listings expires_at default to 7 days
-- Date: 2025-01-23

BEGIN;

-- Mevcut default constraint'i kaldır ve yenisini ekle
ALTER TABLE cars_listings 
ALTER COLUMN expires_at SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days');

-- Yorum ekle
COMMENT ON COLUMN cars_listings.expires_at IS 'İlanın bitiş tarihi - default 7 gün';

COMMIT;