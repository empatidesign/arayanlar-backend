-- Araba ilanları tablosuna paket sistemi alanlarını ekle
-- Bu migration cars_listings tablosuna paket sistemi için gerekli alanları ekler

DO $$
BEGIN

-- package_type alanını ekle (free, premium)
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='package_type') THEN
ALTER TABLE cars_listings ADD COLUMN package_type VARCHAR(20) DEFAULT 'free';
END IF;

-- package_name alanını ekle
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='package_name') THEN
ALTER TABLE cars_listings ADD COLUMN package_name VARCHAR(100);
END IF;

-- package_price alanını ekle
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='package_price') THEN
ALTER TABLE cars_listings ADD COLUMN package_price DECIMAL(10,2) DEFAULT 0;
END IF;

-- duration_days alanını ekle (ilan süresi gün olarak)
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='duration_days') THEN
ALTER TABLE cars_listings ADD COLUMN duration_days INTEGER DEFAULT 7;
END IF;

-- has_serious_buyer_badge alanını ekle (ciddi alıcı etiketi)
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='has_serious_buyer_badge') THEN
ALTER TABLE cars_listings ADD COLUMN has_serious_buyer_badge BOOLEAN DEFAULT FALSE;
END IF;

-- expires_at alanını ekle (ilanın bitiş tarihi)
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='expires_at') THEN
ALTER TABLE cars_listings ADD COLUMN expires_at TIMESTAMP;
END IF;

-- brand_id alanını ekle
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='brand_id') THEN
ALTER TABLE cars_listings ADD COLUMN brand_id INTEGER;
END IF;

-- category_id alanını ekle
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='category_id') THEN
ALTER TABLE cars_listings ADD COLUMN category_id INTEGER;
END IF;

-- status alanını ekle (pending, approved)
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='status') THEN
ALTER TABLE cars_listings ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
END IF;

-- rejection_reason alanını ekle
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars_listings' AND column_name='rejection_reason') THEN
ALTER TABLE cars_listings ADD COLUMN rejection_reason TEXT;
END IF;

END $$;

-- İndeksler oluştur
CREATE INDEX IF NOT EXISTS idx_cars_listings_package_type ON cars_listings(package_type);
CREATE INDEX IF NOT EXISTS idx_cars_listings_serious_buyer ON cars_listings(has_serious_buyer_badge) WHERE has_serious_buyer_badge = true;
CREATE INDEX IF NOT EXISTS idx_cars_listings_status ON cars_listings(status);
CREATE INDEX IF NOT EXISTS idx_cars_listings_expires_at ON cars_listings(expires_at);

-- Mevcut ilanların expires_at değerini duration_days'e göre güncelle
UPDATE cars_listings 
SET expires_at = created_at + INTERVAL '1 day' * duration_days
WHERE expires_at IS NULL AND status = 'approved';

-- Yorum ekle
COMMENT ON COLUMN cars_listings.package_type IS 'Paket tipi: free, premium';
COMMENT ON COLUMN cars_listings.package_name IS 'Paket adı';
COMMENT ON COLUMN cars_listings.package_price IS 'Paket fiyatı (TL)';
COMMENT ON COLUMN cars_listings.duration_days IS 'İlan süresi (gün)';
COMMENT ON COLUMN cars_listings.has_serious_buyer_badge IS 'Ciddi alıcı etiketi var mı';
COMMENT ON COLUMN cars_listings.expires_at IS 'İlanın bitiş tarihi';
COMMENT ON COLUMN cars_listings.brand_id IS 'Marka ID si';
COMMENT ON COLUMN cars_listings.category_id IS 'Kategori ID si';
COMMENT ON COLUMN cars_listings.status IS 'İlan durumu (pending, approved)';
COMMENT ON COLUMN cars_listings.rejection_reason IS 'Red nedeni';