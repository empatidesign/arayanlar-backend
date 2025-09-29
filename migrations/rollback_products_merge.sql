-- Rollback: Products tablosunu geri getir ve listings tablosunu eski haline döndür
-- Migration: Rollback merge_products_to_listings.sql
-- Date: 2025-01-23

BEGIN;

-- 1. Products tablosunu yeniden oluştur
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  model VARCHAR(255),
  description TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  images JSONB DEFAULT '[]',
  colors JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}'
);

-- 2. Products tablosu için indeksler
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_images ON products USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_products_colors ON products USING GIN (colors);
CREATE INDEX IF NOT EXISTS idx_products_specifications ON products USING GIN (specifications);

-- 3. Migrated products verilerini listings tablosundan products tablosuna geri taşı
INSERT INTO products (
    name,
    brand_id,
    model,
    description,
    image,
    created_at,
    updated_at,
    images,
    colors,
    specifications
)
SELECT 
    l.title as name,
    l.brand_id,
    l.category_data->>'model' as model,
    l.description,
    l.main_image as image,
    l.created_at,
    l.updated_at,
    COALESCE(l.images, '[]'::jsonb) as images,
    COALESCE(l.category_data->'colors', '[]'::jsonb) as colors,
    COALESCE(l.category_data->'specifications', '{}'::jsonb) as specifications
FROM listings l
WHERE l.category_data->>'product_type' = 'migrated_from_products';

-- 4. Migrated products verilerini listings tablosundan sil
DELETE FROM listings WHERE category_data->>'product_type' = 'migrated_from_products';

-- 5. Listings tablosuna product_id sütununu geri ekle
ALTER TABLE listings ADD COLUMN IF NOT EXISTS product_id INTEGER;

-- 6. Foreign key constraint'i geri ekle (önce var mı kontrol et)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_listings_product') THEN
        ALTER TABLE listings ADD CONSTRAINT fk_listings_product 
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. İndeks ekle
CREATE INDEX IF NOT EXISTS idx_listings_product ON listings(product_id);

COMMIT;

-- Verification queries - rollback sonrası kontrol için
-- SELECT COUNT(*) as restored_products FROM products;
-- SELECT COUNT(*) as remaining_listings FROM listings;