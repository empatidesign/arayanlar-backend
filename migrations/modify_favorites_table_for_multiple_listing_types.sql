-- Favoriler tablosunu farklı ilan tiplerini destekleyecek şekilde güncelle
-- Migration: Modify favorites table for multiple listing types
-- Date: 2025-01-23

BEGIN;

-- Listing type kolonu ekle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='favorites' AND column_name='listing_type') THEN
        ALTER TABLE favorites ADD COLUMN listing_type VARCHAR(20) NOT NULL DEFAULT 'watch';
    END IF;
END $$;

-- Housing listing ID kolonu ekle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='favorites' AND column_name='housing_listing_id') THEN
        ALTER TABLE favorites ADD COLUMN housing_listing_id INTEGER REFERENCES housing_listings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Cars listing ID kolonu ekle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='favorites' AND column_name='cars_listing_id') THEN
        ALTER TABLE favorites ADD COLUMN cars_listing_id INTEGER REFERENCES cars_listings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Mevcut listing_id kolonunu watch_listing_id olarak yeniden adlandır
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='favorites' AND column_name='listing_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='favorites' AND column_name='watch_listing_id') THEN
        ALTER TABLE favorites RENAME COLUMN listing_id TO watch_listing_id;
    END IF;
END $$;

-- Eski unique constraint'i kaldır
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name='favorites' AND constraint_name='favorites_user_id_listing_id_key') THEN
        ALTER TABLE favorites DROP CONSTRAINT favorites_user_id_listing_id_key;
    END IF;
END $$;

-- Yeni unique indeksler ekle (her listing type için ayrı)
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_watch_unique 
ON favorites(user_id, watch_listing_id) 
WHERE listing_type = 'watch' AND watch_listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_housing_unique 
ON favorites(user_id, housing_listing_id) 
WHERE listing_type = 'housing' AND housing_listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_cars_unique 
ON favorites(user_id, cars_listing_id) 
WHERE listing_type = 'cars' AND cars_listing_id IS NOT NULL;

-- Yeni indeksler ekle
CREATE INDEX IF NOT EXISTS idx_favorites_listing_type ON favorites(listing_type);
CREATE INDEX IF NOT EXISTS idx_favorites_housing_listing_id ON favorites(housing_listing_id) WHERE housing_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_cars_listing_id ON favorites(cars_listing_id) WHERE cars_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_watch_listing_id ON favorites(watch_listing_id) WHERE watch_listing_id IS NOT NULL;

-- Check constraint ekle - sadece bir listing ID'si dolu olmalı
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name='favorites' AND constraint_name='favorites_single_listing_check') THEN
        ALTER TABLE favorites ADD CONSTRAINT favorites_single_listing_check 
        CHECK (
            (listing_type = 'watch' AND watch_listing_id IS NOT NULL AND housing_listing_id IS NULL AND cars_listing_id IS NULL) OR
            (listing_type = 'housing' AND housing_listing_id IS NOT NULL AND watch_listing_id IS NULL AND cars_listing_id IS NULL) OR
            (listing_type = 'cars' AND cars_listing_id IS NOT NULL AND watch_listing_id IS NULL AND housing_listing_id IS NULL)
        );
    END IF;
END $$;

-- Yorumları güncelle
COMMENT ON TABLE favorites IS 'Kullanıcıların favori ilanları (watch, housing, cars)';
COMMENT ON COLUMN favorites.listing_type IS 'İlan tipi (watch, housing, cars)';
COMMENT ON COLUMN favorites.watch_listing_id IS 'Favoriye eklenen saat ilanının ID si';
COMMENT ON COLUMN favorites.housing_listing_id IS 'Favoriye eklenen konut ilanının ID si';
COMMENT ON COLUMN favorites.cars_listing_id IS 'Favoriye eklenen araç ilanının ID si';

COMMIT;