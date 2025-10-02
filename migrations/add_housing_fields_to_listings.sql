-- Konut ilanları için gerekli alanları ekle
-- Migration: Add housing fields to listings table
-- Date: 2025-01-23

BEGIN;

-- Konut ilanları için yeni alanlar ekle
DO $$
BEGIN
    -- Bölge bilgisi (il) için
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='province') THEN
        ALTER TABLE listings ADD COLUMN province VARCHAR(100);
    END IF;
    
    -- İlçe bilgisi için (mevcut location_district'i kullanabiliriz ama daha açık isim verelim)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='district') THEN
        ALTER TABLE listings ADD COLUMN district VARCHAR(100);
    END IF;
    
    -- Mahalle bilgisi için
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='neighborhood') THEN
        ALTER TABLE listings ADD COLUMN neighborhood VARCHAR(100);
    END IF;
    
    -- Konut tipi için (Daire, Villa, Müstakil Ev, Dubleks, vb.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='property_type') THEN
        ALTER TABLE listings ADD COLUMN property_type VARCHAR(50);
    END IF;
    
    -- Site içi mi? (Evet/Hayır)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_in_site') THEN
        ALTER TABLE listings ADD COLUMN is_in_site BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Site adı (eğer site içindeyse)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='site_name') THEN
        ALTER TABLE listings ADD COLUMN site_name VARCHAR(200);
    END IF;
    
    -- Oda sayısı (1+0, 1+1, 2+1, 3+1, 4+1, 5+1, vb.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='room_count') THEN
        ALTER TABLE listings ADD COLUMN room_count VARCHAR(20);
    END IF;
    
    -- Brüt m2
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='gross_area') THEN
        ALTER TABLE listings ADD COLUMN gross_area INTEGER;
    END IF;
    
    -- Net m2
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='net_area') THEN
        ALTER TABLE listings ADD COLUMN net_area INTEGER;
    END IF;
    
    -- Bulunduğu kat
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='floor_number') THEN
        ALTER TABLE listings ADD COLUMN floor_number INTEGER;
    END IF;
    
    -- Toplam kat sayısı
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='total_floors') THEN
        ALTER TABLE listings ADD COLUMN total_floors INTEGER;
    END IF;
    
    -- Bina yaşı
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='building_age') THEN
        ALTER TABLE listings ADD COLUMN building_age INTEGER;
    END IF;
    
    -- Isıtma tipi (Kombi, Merkezi, Klima, Soba, vb.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='heating_type') THEN
        ALTER TABLE listings ADD COLUMN heating_type VARCHAR(50);
    END IF;
    
    -- Balkon var mı?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='has_balcony') THEN
        ALTER TABLE listings ADD COLUMN has_balcony BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Eşyalı mı?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_furnished') THEN
        ALTER TABLE listings ADD COLUMN is_furnished BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Otopark var mı?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='has_parking') THEN
        ALTER TABLE listings ADD COLUMN has_parking BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Asansör var mı?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='has_elevator') THEN
        ALTER TABLE listings ADD COLUMN has_elevator BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Güvenlik var mı?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='has_security') THEN
        ALTER TABLE listings ADD COLUMN has_security BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Havuz var mı?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='has_pool') THEN
        ALTER TABLE listings ADD COLUMN has_pool BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Spor salonu var mı?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='has_gym') THEN
        ALTER TABLE listings ADD COLUMN has_gym BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Bahçe var mı?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='has_garden') THEN
        ALTER TABLE listings ADD COLUMN has_garden BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Cephe yönü (Kuzey, Güney, Doğu, Batı, Güneydoğu, vb.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='facade_direction') THEN
        ALTER TABLE listings ADD COLUMN facade_direction VARCHAR(50);
    END IF;
    
    -- Banyo sayısı
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='bathroom_count') THEN
        ALTER TABLE listings ADD COLUMN bathroom_count INTEGER DEFAULT 1;
    END IF;
    
    -- Aidat (TL)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='monthly_dues') THEN
        ALTER TABLE listings ADD COLUMN monthly_dues DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Tapu durumu (Kat Mülkiyeti, Kat İrtifakı, Arsa, vb.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='deed_status') THEN
        ALTER TABLE listings ADD COLUMN deed_status VARCHAR(50);
    END IF;
    
    -- Krediye uygun mu?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_loan_suitable') THEN
        ALTER TABLE listings ADD COLUMN is_loan_suitable BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Takasa uygun mu?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_exchange_suitable') THEN
        ALTER TABLE listings ADD COLUMN is_exchange_suitable BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_listings_province ON listings(province);
CREATE INDEX IF NOT EXISTS idx_listings_district ON listings(district);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_room_count ON listings(room_count);
CREATE INDEX IF NOT EXISTS idx_listings_gross_area ON listings(gross_area);
CREATE INDEX IF NOT EXISTS idx_listings_building_age ON listings(building_age);
CREATE INDEX IF NOT EXISTS idx_listings_is_in_site ON listings(is_in_site);
CREATE INDEX IF NOT EXISTS idx_listings_heating_type ON listings(heating_type);
CREATE INDEX IF NOT EXISTS idx_listings_deed_status ON listings(deed_status);

-- 3. Yorumlar ekle
COMMENT ON COLUMN listings.province IS 'İl bilgisi';
COMMENT ON COLUMN listings.district IS 'İlçe bilgisi';
COMMENT ON COLUMN listings.neighborhood IS 'Mahalle bilgisi';
COMMENT ON COLUMN listings.property_type IS 'Konut tipi (Daire, Villa, Müstakil Ev, Dubleks, vb.)';
COMMENT ON COLUMN listings.is_in_site IS 'Site içinde mi?';
COMMENT ON COLUMN listings.site_name IS 'Site adı (eğer site içindeyse)';
COMMENT ON COLUMN listings.room_count IS 'Oda sayısı (1+0, 1+1, 2+1, 3+1, vb.)';
COMMENT ON COLUMN listings.gross_area IS 'Brüt m2';
COMMENT ON COLUMN listings.net_area IS 'Net m2';
COMMENT ON COLUMN listings.floor_number IS 'Bulunduğu kat';
COMMENT ON COLUMN listings.total_floors IS 'Toplam kat sayısı';
COMMENT ON COLUMN listings.building_age IS 'Bina yaşı (yıl)';
COMMENT ON COLUMN listings.heating_type IS 'Isıtma tipi (Kombi, Merkezi, Klima, Soba, vb.)';
COMMENT ON COLUMN listings.has_balcony IS 'Balkon var mı?';
COMMENT ON COLUMN listings.is_furnished IS 'Eşyalı mı?';
COMMENT ON COLUMN listings.has_parking IS 'Otopark var mı?';
COMMENT ON COLUMN listings.has_elevator IS 'Asansör var mı?';
COMMENT ON COLUMN listings.has_security IS 'Güvenlik var mı?';
COMMENT ON COLUMN listings.has_pool IS 'Havuz var mı?';
COMMENT ON COLUMN listings.has_gym IS 'Spor salonu var mı?';
COMMENT ON COLUMN listings.has_garden IS 'Bahçe var mı?';
COMMENT ON COLUMN listings.facade_direction IS 'Cephe yönü (Kuzey, Güney, Doğu, Batı, vb.)';
COMMENT ON COLUMN listings.bathroom_count IS 'Banyo sayısı';
COMMENT ON COLUMN listings.monthly_dues IS 'Aylık aidat (TL)';
COMMENT ON COLUMN listings.deed_status IS 'Tapu durumu (Kat Mülkiyeti, Kat İrtifakı, Arsa, vb.)';
COMMENT ON COLUMN listings.is_loan_suitable IS 'Krediye uygun mu?';
COMMENT ON COLUMN listings.is_exchange_suitable IS 'Takasa uygun mu?';

COMMIT;

-- Verification query
-- SELECT COUNT(*) as housing_listings FROM listings WHERE category_id = (SELECT id FROM sections WHERE name = 'Konut');