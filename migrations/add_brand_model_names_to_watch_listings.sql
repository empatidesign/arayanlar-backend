-- Watch listings tablosuna marka ve model isim alanları ekle
-- Migration: Add brand_name and model_name fields to watch_listings
-- Date: 2025-01-23

BEGIN;

-- Watch_listings tablosuna brand_name ve model_name alanları ekle
ALTER TABLE watch_listings 
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS model_name VARCHAR(255);

-- Yorumlar ekle
COMMENT ON COLUMN watch_listings.brand_name IS 'Saat markası adı (direkt metin olarak)';
COMMENT ON COLUMN watch_listings.model_name IS 'Saat model adı (direkt metin olarak)';

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_watch_listings_brand_name ON watch_listings(brand_name);
CREATE INDEX IF NOT EXISTS idx_watch_listings_model_name ON watch_listings(model_name);

-- Mevcut verileri güncelle (brand_id ve product_id'den brand_name ve model_name'i al)
UPDATE watch_listings 
SET 
    brand_name = wb.name,
    model_name = wp.name
FROM watch_brands wb, watch_products wp
WHERE watch_listings.brand_id = wb.id 
    AND watch_listings.product_id = wp.id
    AND (watch_listings.brand_name IS NULL OR watch_listings.model_name IS NULL);

COMMIT;

-- Verification query
-- SELECT id, brand_name, model_name, brand_id, product_id FROM watch_listings LIMIT 5;