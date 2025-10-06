-- Konut ilanları tablosu - Özel konut ilanları için
-- Migration: Create housing_listings table
-- Date: 2025-01-23

CREATE TABLE IF NOT EXISTS housing_listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- İlan bilgileri
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TL',
    
    -- Konum bilgileri
    province VARCHAR(100) NOT NULL, -- İl
    district VARCHAR(100) NOT NULL, -- İlçe
    neighborhood VARCHAR(100), -- Mahalle
    location_address TEXT, -- Detaylı adres
    
    -- Konut detayları
    property_type VARCHAR(50) NOT NULL, -- Daire, Villa, Müstakil Ev, Dubleks, vb.
    room_count VARCHAR(20) NOT NULL, -- 1+0, 1+1, 2+1, 3+1, vb.
    gross_area INTEGER NOT NULL, -- Brüt m2
    net_area INTEGER, -- Net m2
    floor_number INTEGER, -- Bulunduğu kat
    total_floors INTEGER, -- Toplam kat sayısı
    building_age INTEGER, -- Bina yaşı (yıl)
    
    -- Site bilgileri
    is_in_site BOOLEAN DEFAULT FALSE, -- Site içinde mi?
    site_name VARCHAR(200), -- Site adı (eğer site içindeyse)
    
    -- Özellikler
    heating_type VARCHAR(50), -- Kombi, Merkezi, Klima, Soba, vb.
    has_balcony BOOLEAN DEFAULT FALSE, -- Balkon var mı?
    is_furnished BOOLEAN DEFAULT FALSE, -- Eşyalı mı?
    has_parking BOOLEAN DEFAULT FALSE, -- Otopark var mı?
    has_elevator BOOLEAN DEFAULT FALSE, -- Asansör var mı?
    has_security BOOLEAN DEFAULT FALSE, -- Güvenlik var mı?
    has_pool BOOLEAN DEFAULT FALSE, -- Havuz var mı?
    has_gym BOOLEAN DEFAULT FALSE, -- Spor salonu var mı?
    has_garden BOOLEAN DEFAULT FALSE, -- Bahçe var mı?
    facade_direction VARCHAR(50), -- Cephe yönü (Kuzey, Güney, Doğu, Batı, vb.)
    bathroom_count INTEGER DEFAULT 1, -- Banyo sayısı
    monthly_dues DECIMAL(10,2) DEFAULT 0, -- Aylık aidat (TL)
    
    -- Hukuki durum
    deed_status VARCHAR(50), -- Tapu durumu (Kat Mülkiyeti, Kat İrtifakı, Arsa, vb.)
    is_loan_suitable BOOLEAN DEFAULT TRUE, -- Krediye uygun mu?
    is_exchange_suitable BOOLEAN DEFAULT FALSE, -- Takasa uygun mu?
    
    -- Medya
    images JSONB DEFAULT '[]', -- Resimler ["image1.jpg", "image2.jpg"]
    main_image VARCHAR(500), -- Ana resim
    
    -- İletişim
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    contact_whatsapp VARCHAR(20),
    
    -- Durum bilgileri
    is_urgent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- İstatistikler
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    
    -- Paket bilgileri
    package_type VARCHAR(20) DEFAULT 'free', -- free, premium
    package_name VARCHAR(100),
    package_price DECIMAL(10,2) DEFAULT 0,
    duration_days INTEGER DEFAULT 7, -- İlan süresi gün olarak
    has_serious_buyer_badge BOOLEAN DEFAULT FALSE, -- Ciddi alıcı etiketi
    
    -- Zaman bilgileri
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    
    -- Moderasyon
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_housing_listings_user ON housing_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_housing_listings_province ON housing_listings(province);
CREATE INDEX IF NOT EXISTS idx_housing_listings_district ON housing_listings(district);
CREATE INDEX IF NOT EXISTS idx_housing_listings_property_type ON housing_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_housing_listings_room_count ON housing_listings(room_count);
CREATE INDEX IF NOT EXISTS idx_housing_listings_price ON housing_listings(price);
CREATE INDEX IF NOT EXISTS idx_housing_listings_gross_area ON housing_listings(gross_area);
CREATE INDEX IF NOT EXISTS idx_housing_listings_building_age ON housing_listings(building_age);
CREATE INDEX IF NOT EXISTS idx_housing_listings_heating_type ON housing_listings(heating_type);
CREATE INDEX IF NOT EXISTS idx_housing_listings_deed_status ON housing_listings(deed_status);
CREATE INDEX IF NOT EXISTS idx_housing_listings_active ON housing_listings(is_active, status);
CREATE INDEX IF NOT EXISTS idx_housing_listings_created ON housing_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_housing_listings_expires ON housing_listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_housing_listings_urgent ON housing_listings(is_urgent) WHERE is_urgent = true;

-- JSONB indeksleri
CREATE INDEX IF NOT EXISTS idx_housing_listings_images ON housing_listings USING GIN (images);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_housing_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_housing_listings_updated_at 
    BEFORE UPDATE ON housing_listings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_housing_listings_updated_at();

-- Yorumlar
COMMENT ON TABLE housing_listings IS 'Konut ilanları tablosu - özel konut ilanları için';
COMMENT ON COLUMN housing_listings.province IS 'İl bilgisi';
COMMENT ON COLUMN housing_listings.district IS 'İlçe bilgisi';
COMMENT ON COLUMN housing_listings.neighborhood IS 'Mahalle bilgisi';
COMMENT ON COLUMN housing_listings.property_type IS 'Konut tipi (Daire, Villa, Müstakil Ev, Dubleks, vb.)';
COMMENT ON COLUMN housing_listings.room_count IS 'Oda sayısı (1+0, 1+1, 2+1, 3+1, vb.)';
COMMENT ON COLUMN housing_listings.gross_area IS 'Brüt m2';
COMMENT ON COLUMN housing_listings.net_area IS 'Net m2';
COMMENT ON COLUMN housing_listings.floor_number IS 'Bulunduğu kat';
COMMENT ON COLUMN housing_listings.total_floors IS 'Toplam kat sayısı';
COMMENT ON COLUMN housing_listings.building_age IS 'Bina yaşı (yıl)';
COMMENT ON COLUMN housing_listings.is_in_site IS 'Site içinde mi?';
COMMENT ON COLUMN housing_listings.site_name IS 'Site adı (eğer site içindeyse)';
COMMENT ON COLUMN housing_listings.heating_type IS 'Isıtma tipi (Kombi, Merkezi, Klima, Soba, vb.)';
COMMENT ON COLUMN housing_listings.has_balcony IS 'Balkon var mı?';
COMMENT ON COLUMN housing_listings.is_furnished IS 'Eşyalı mı?';
COMMENT ON COLUMN housing_listings.has_parking IS 'Otopark var mı?';
COMMENT ON COLUMN housing_listings.has_elevator IS 'Asansör var mı?';
COMMENT ON COLUMN housing_listings.has_security IS 'Güvenlik var mı?';
COMMENT ON COLUMN housing_listings.has_pool IS 'Havuz var mı?';
COMMENT ON COLUMN housing_listings.has_gym IS 'Spor salonu var mı?';
COMMENT ON COLUMN housing_listings.has_garden IS 'Bahçe var mı?';
COMMENT ON COLUMN housing_listings.facade_direction IS 'Cephe yönü (Kuzey, Güney, Doğu, Batı, vb.)';
COMMENT ON COLUMN housing_listings.bathroom_count IS 'Banyo sayısı';
COMMENT ON COLUMN housing_listings.monthly_dues IS 'Aylık aidat (TL)';
COMMENT ON COLUMN housing_listings.deed_status IS 'Tapu durumu (Kat Mülkiyeti, Kat İrtifakı, Arsa, vb.)';
COMMENT ON COLUMN housing_listings.is_loan_suitable IS 'Krediye uygun mu?';
COMMENT ON COLUMN housing_listings.is_exchange_suitable IS 'Takasa uygun mu?';
COMMENT ON COLUMN housing_listings.package_type IS 'Paket tipi (free, premium)';
COMMENT ON COLUMN housing_listings.package_name IS 'Paket adı';
COMMENT ON COLUMN housing_listings.package_price IS 'Paket fiyatı (TL)';
COMMENT ON COLUMN housing_listings.duration_days IS 'İlan süresi (gün)';
COMMENT ON COLUMN housing_listings.has_serious_buyer_badge IS 'Ciddi alıcı etiketi var mı?';
COMMENT ON COLUMN housing_listings.status IS 'İlan durumu (pending, approved, rejected)';