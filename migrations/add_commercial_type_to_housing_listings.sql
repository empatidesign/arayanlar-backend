-- Ticari ilan desteği için housing_listings tablosuna commercial_type kolonu ekleme
-- Migration: Add commercial_type to housing_listings
-- Date: 2025-01-28

-- Ticari ilan tipi kolonu ekle
ALTER TABLE housing_listings 
ADD COLUMN IF NOT EXISTS commercial_type VARCHAR(50);

-- room_count kolonunu nullable yap (ticari ilanlar için oda sayısı gerekmez)
ALTER TABLE housing_listings 
ALTER COLUMN room_count DROP NOT NULL;

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_housing_listings_commercial_type 
ON housing_listings(commercial_type);

-- Yorum ekle
COMMENT ON COLUMN housing_listings.commercial_type IS 'Ticari ilan tipi (DÜKKAN, OFİS, FABRİKA, DEPO, ATÖLYE, İMALATHANE) - Sadece ticari ilanlar için dolu';
COMMENT ON COLUMN housing_listings.room_count IS 'Oda sayısı (1+0, 1+1, 2+1, 3+1, vb.) - Sadece konut ilanları için zorunlu';

-- property_type kolonuna ticari tipleri de ekleyebilmek için
-- Mevcut veriler: DAİRE, VİLLA
-- Yeni veriler: DÜKKAN, OFİS, FABRİKA, DEPO, ATÖLYE, İMALATHANE
