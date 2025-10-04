-- Saat modelleri tablosuna is_active alanı ekleme
-- Migration: Add is_active field to watch_products table
-- Date: 2025-01-23

-- watch_products tablosuna is_active alanı ekle
ALTER TABLE watch_products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_watch_products_active ON watch_products(is_active);

-- Mevcut tüm kayıtları aktif olarak işaretle
UPDATE watch_products SET is_active = TRUE WHERE is_active IS NULL;

-- Başarı mesajı
SELECT 'watch_products tablosuna is_active alanı başarıyla eklendi' as message;