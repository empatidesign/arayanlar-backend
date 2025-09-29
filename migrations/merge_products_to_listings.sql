-- Products tablosundaki verileri listings tablosuna taşı ve products tablosunu kaldır
-- Migration: Merge products table into listings table
-- Date: 2025-01-23

BEGIN;

-- 1. Products tablosundaki verileri listings tablosuna taşı
INSERT INTO listings (
    title,
    description,
    category_id,
    brand_id,
    main_image,
    images,
    category_data,
    is_active,
    status,
    created_at,
    updated_at
)
SELECT 
    p.name as title,
    p.description,
    b.category_id,
    p.brand_id,
    p.image as main_image,
    COALESCE(p.images, '[]'::jsonb) as images,
    jsonb_build_object(
        'model', COALESCE(p.model, ''),
        'colors', COALESCE(p.colors, '[]'::jsonb),
        'specifications', COALESCE(p.specifications, '{}'::jsonb),
        'product_type', 'migrated_from_products'
    ) as category_data,
    true as is_active,
    'approved' as status,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.id IS NOT NULL;

-- 2. Products tablosuna bağlı foreign key constraint'leri kaldır
ALTER TABLE listings DROP CONSTRAINT IF EXISTS fk_listings_product;

-- 3. Listings tablosundan product_id sütununu kaldır (artık gerekli değil)
ALTER TABLE listings DROP COLUMN IF EXISTS product_id;

-- 4. Products tablosunu kaldır
DROP TABLE IF EXISTS products CASCADE;

-- 5. Products ile ilgili route ve controller dosyalarının silinmesi gerektiğini not et
-- NOT: Aşağıdaki dosyalar manuel olarak silinmeli:
-- - controllers/productsController.js
-- - controllers/productColorsController.js  
-- - routes/products.js
-- - routes/productColors.js
-- - uploads/products/ klasörü

COMMIT;

-- Verification query - migration sonrası kontrol için
-- SELECT COUNT(*) as migrated_products FROM listings WHERE category_data->>'product_type' = 'migrated_from_products';