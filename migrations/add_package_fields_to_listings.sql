-- Listings tablosuna paket bilgileri için gerekli alanları ekle
-- Migration: Add package fields to listings table
-- Date: 2025-01-23

DO $$
BEGIN
    -- package_type alanını ekle (free, premium)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='package_type') THEN
        ALTER TABLE listings ADD COLUMN package_type VARCHAR(20) DEFAULT 'free';
    END IF;
    
    -- package_name alanını ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='package_name') THEN
        ALTER TABLE listings ADD COLUMN package_name VARCHAR(100);
    END IF;
    
    -- package_price alanını ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='package_price') THEN
        ALTER TABLE listings ADD COLUMN package_price DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- duration_days alanını ekle (ilan süresi gün olarak)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='duration_days') THEN
        ALTER TABLE listings ADD COLUMN duration_days INTEGER DEFAULT 7;
    END IF;
    
    -- has_serious_buyer_badge alanını ekle (ciddi alıcı etiketi)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='has_serious_buyer_badge') THEN
        ALTER TABLE listings ADD COLUMN has_serious_buyer_badge BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_listings_package_type ON listings(package_type);
CREATE INDEX IF NOT EXISTS idx_listings_serious_buyer ON listings(has_serious_buyer_badge) WHERE has_serious_buyer_badge = true;

-- Mevcut ilanların expires_at değerini duration_days'e göre güncelle
UPDATE listings 
SET expires_at = created_at + INTERVAL '1 day' * duration_days 
WHERE expires_at IS NOT NULL;

-- Yorumlar ekle
COMMENT ON COLUMN listings.package_type IS 'Paket tipi: free, premium';
COMMENT ON COLUMN listings.package_name IS 'Paket adı';
COMMENT ON COLUMN listings.package_price IS 'Paket fiyatı (TL)';
COMMENT ON COLUMN listings.duration_days IS 'İlan süresi (gün)';
COMMENT ON COLUMN listings.has_serious_buyer_badge IS 'Ciddi alıcı etiketi var mı';