-- Tablo isimlerini saat ilanları için değiştir
-- Bu script sadece tablo isimlerini değiştirir, içerik ve sütun isimleri aynı kalır

-- listings tablosunu watch_listings olarak yeniden adlandır
ALTER TABLE listings RENAME TO watch_listings;

-- products tablosunu watch_products olarak yeniden adlandır  
ALTER TABLE products RENAME TO watch_products;

-- İndeksleri de güncelle
-- listings tablosu indeksleri
DROP INDEX IF EXISTS idx_listings_user_id;
DROP INDEX IF EXISTS idx_listings_category_id;
DROP INDEX IF EXISTS idx_listings_location;
DROP INDEX IF EXISTS idx_listings_price;
DROP INDEX IF EXISTS idx_listings_created_at;
DROP INDEX IF EXISTS idx_listings_status;

CREATE INDEX idx_watch_listings_user_id ON watch_listings(user_id);
CREATE INDEX idx_watch_listings_category_id ON watch_listings(category_id);
CREATE INDEX idx_watch_listings_location ON watch_listings(location_city, location_district);
CREATE INDEX idx_watch_listings_price ON watch_listings(price);
CREATE INDEX idx_watch_listings_created_at ON watch_listings(created_at);
CREATE INDEX idx_watch_listings_status ON watch_listings(status);

-- products tablosu indeksleri
DROP INDEX IF EXISTS idx_products_brand_id;
DROP INDEX IF EXISTS idx_products_category_id;
DROP INDEX IF EXISTS idx_products_name;

CREATE INDEX idx_watch_products_brand_id ON watch_products(brand_id);
CREATE INDEX idx_watch_products_category_id ON watch_products(category_id);
CREATE INDEX idx_watch_products_name ON watch_products(name);

-- Başarı mesajı
SELECT 'Tablo isimleri başarıyla güncellendi: listings -> watch_listings, products -> watch_products' as message;