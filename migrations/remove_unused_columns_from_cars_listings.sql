-- Kullanılmayan alanları cars_listings tablosundan kaldır
-- Migration: Remove unused columns from cars_listings table
-- Date: 2025-01-23

BEGIN;

-- Kullanılmayan alanları kaldır
ALTER TABLE cars_listings 
DROP COLUMN IF EXISTS brand_id,
DROP COLUMN IF EXISTS selected_color_id,
DROP COLUMN IF EXISTS selected_color_name,
DROP COLUMN IF EXISTS selected_color_hex,
DROP COLUMN IF EXISTS selected_color_image,
DROP COLUMN IF EXISTS selected_engine_id,
DROP COLUMN IF EXISTS is_featured,
DROP COLUMN IF EXISTS favorite_count;

-- İlgili indeksleri de kaldır
DROP INDEX IF EXISTS idx_cars_listings_brand;

-- Yorumları güncelle
COMMENT ON TABLE cars_listings IS 'Araç ilanları tablosu - özel araç ilanları için (temizlenmiş versiyon)';

COMMIT;

-- Kaldırılan alanlar:
-- - brand_id: Frontend'den gönderilmiyor, boş kalıyor
-- - selected_color_*: Renk seçimi özelliği kullanılmıyor
-- - selected_engine_id: Motor seçimi özelliği kullanılmıyor  
-- - is_featured: Bu özellik henüz kullanılmıyor
-- - favorite_count: İstatistik özelliği henüz kullanılmıyor

-- Korunan alanlar:
-- - is_active: İlan aktiflik durumu için gerekli
-- - view_count: Görüntülenme sayısı için gerekli
-- - rejection_reason: Moderasyon sistemi için gerekli