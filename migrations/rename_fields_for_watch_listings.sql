-- Saat ilanları için mevcut alan isimlerini yeniden adlandır
-- Migration: Rename existing fields for watch listings (SADECE İSİM DEĞİŞİKLİĞİ)
-- Date: 2025-01-23

BEGIN;

-- Mevcut alanları saat ilanlarına uygun şekilde yeniden adlandır
-- Bu migration SADECE alan isimlerini değiştiriyor, hiçbir veri kaybı yok

-- 1. Mevcut alanları saat terminolojisine uygun şekilde yeniden adlandır

-- brand_id -> watch_brand_id (saat markası)
ALTER TABLE listings RENAME COLUMN brand_id TO watch_brand_id;

-- title -> watch_title (saat başlığı)
ALTER TABLE listings RENAME COLUMN title TO watch_title;

-- description -> watch_description (saat açıklaması)  
ALTER TABLE listings RENAME COLUMN description TO watch_description;

-- price -> watch_price (saat fiyatı)
ALTER TABLE listings RENAME COLUMN price TO watch_price;

-- location_city -> watch_location_city (saat satış şehri)
ALTER TABLE listings RENAME COLUMN location_city TO watch_location_city;

-- location_district -> watch_location_district (saat satış ilçesi)
ALTER TABLE listings RENAME COLUMN location_district TO watch_location_district;

-- contact_phone -> watch_contact_phone (saat satıcı telefonu)
ALTER TABLE listings RENAME COLUMN contact_phone TO watch_contact_phone;

-- contact_email -> watch_contact_email (saat satıcı emaili)
ALTER TABLE listings RENAME COLUMN contact_email TO watch_contact_email;

-- images -> watch_images (saat resimleri)
ALTER TABLE listings RENAME COLUMN images TO watch_images;

-- main_image -> watch_main_image (saat ana resmi)
ALTER TABLE listings RENAME COLUMN main_image TO watch_main_image;

-- 2. İndeksleri güncelle (eski indeksler otomatik olarak yeni isimlerle çalışacak)
-- Yeni indeksler ekle
CREATE INDEX IF NOT EXISTS idx_listings_watch_brand_id ON listings(watch_brand_id);
CREATE INDEX IF NOT EXISTS idx_listings_watch_price ON listings(watch_price);
CREATE INDEX IF NOT EXISTS idx_listings_watch_location_city ON listings(watch_location_city);

-- 3. Yorumlar ekle
COMMENT ON COLUMN listings.watch_brand_id IS 'Saat markası ID (brands tablosuna referans)';
COMMENT ON COLUMN listings.watch_title IS 'Saat ilanı başlığı';
COMMENT ON COLUMN listings.watch_description IS 'Saat ilanı açıklaması';
COMMENT ON COLUMN listings.watch_price IS 'Saat fiyatı';
COMMENT ON COLUMN listings.watch_location_city IS 'Saat satış şehri';
COMMENT ON COLUMN listings.watch_location_district IS 'Saat satış ilçesi';
COMMENT ON COLUMN listings.watch_contact_phone IS 'Saat satıcı telefon numarası';
COMMENT ON COLUMN listings.watch_contact_email IS 'Saat satıcı email adresi';
COMMENT ON COLUMN listings.watch_images IS 'Saat resim listesi (JSON)';
COMMENT ON COLUMN listings.watch_main_image IS 'Saat ana resmi';

COMMIT;

-- Verification query
-- SELECT watch_title, watch_price FROM listings WHERE category_id = (SELECT id FROM sections WHERE name = 'Saat') LIMIT 5;