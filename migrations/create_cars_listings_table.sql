-- Araç ilanları tablosu - Özel araç ilanları için
-- Migration: Create cars_listings table
-- Date: 2025-01-23

CREATE TABLE IF NOT EXISTS cars_listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Araç bilgileri
    brand_id INTEGER REFERENCES cars_brands(id) ON DELETE RESTRICT,
    product_id INTEGER REFERENCES cars_products(id) ON DELETE RESTRICT,
    brand_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    
    -- İlan bilgileri
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TL',
    
    -- Konum bilgileri
    location_city VARCHAR(100) NOT NULL,
    
    -- Araç detayları (formdan gelen veriler)
    km INTEGER NOT NULL, -- Kilometre (formatlanmış halden çevrilmiş)
    model_year INTEGER NOT NULL, -- Model yılı
    engine_size VARCHAR(20), -- Motor hacmi
    selected_color_id INTEGER, -- Seçilen renk ID'si
    selected_color_name VARCHAR(50), -- Seçilen renk adı
    selected_color_hex VARCHAR(10), -- Seçilen renk hex kodu
    selected_color_image TEXT, -- Seçilen renk resmi URL'si
    selected_engine_id INTEGER, -- Seçilen motor ID'si
    import_status VARCHAR(50), -- İthalat durumu (Distürbütörü, Özel İthalat)
    
    -- Medya
    images JSONB DEFAULT '[]', -- Ek resimler ["image1.jpg", "image2.jpg"]
    main_image VARCHAR(500), -- Ana resim (seçilen renk resmi olabilir)
    
    -- Durum bilgileri
    is_urgent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- İstatistikler
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    
    -- İletişim
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    contact_whatsapp VARCHAR(20),
    
    -- Zaman bilgileri
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    
    -- Moderasyon
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    
    -- Constraints
    CONSTRAINT chk_km_positive CHECK (km >= 0),
    CONSTRAINT chk_model_year_valid CHECK (model_year >= 1900),
    CONSTRAINT chk_price_positive CHECK (price > 0)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_cars_listings_user ON cars_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_cars_listings_brand ON cars_listings(brand_id);
CREATE INDEX IF NOT EXISTS idx_cars_listings_product ON cars_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_cars_listings_location ON cars_listings(location_city);
CREATE INDEX IF NOT EXISTS idx_cars_listings_price ON cars_listings(price);
CREATE INDEX IF NOT EXISTS idx_cars_listings_km ON cars_listings(km);
CREATE INDEX IF NOT EXISTS idx_cars_listings_year ON cars_listings(model_year);
CREATE INDEX IF NOT EXISTS idx_cars_listings_active ON cars_listings(is_active, status);
CREATE INDEX IF NOT EXISTS idx_cars_listings_created ON cars_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cars_listings_expires ON cars_listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_cars_listings_urgent ON cars_listings(is_urgent) WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS idx_cars_listings_import_status ON cars_listings(import_status);

-- JSONB indeksleri
CREATE INDEX IF NOT EXISTS idx_cars_listings_images ON cars_listings USING GIN (images);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_cars_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cars_listings_updated_at 
    BEFORE UPDATE ON cars_listings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_cars_listings_updated_at();

-- Yorumlar
COMMENT ON TABLE cars_listings IS 'Araç ilanları tablosu - özel araç ilanları için';
COMMENT ON COLUMN cars_listings.brand_id IS 'Marka ID si (cars_brands tablosuna referans)';
COMMENT ON COLUMN cars_listings.product_id IS 'Model ID si (cars_products tablosuna referans)';
COMMENT ON COLUMN cars_listings.brand_name IS 'Marka adı (denormalize edilmiş)';
COMMENT ON COLUMN cars_listings.model_name IS 'Model adı (denormalize edilmiş)';
COMMENT ON COLUMN cars_listings.km IS 'Kilometre bilgisi (sayı olarak)';
COMMENT ON COLUMN cars_listings.model_year IS 'Aracın model yılı';
COMMENT ON COLUMN cars_listings.engine_size IS 'Motor hacmi';
COMMENT ON COLUMN cars_listings.selected_color_id IS 'Seçilen rengin ID si';
COMMENT ON COLUMN cars_listings.selected_color_name IS 'Seçilen rengin adı';
COMMENT ON COLUMN cars_listings.selected_color_hex IS 'Seçilen rengin hex kodu';
COMMENT ON COLUMN cars_listings.selected_color_image IS 'Seçilen rengin resim URL si';
COMMENT ON COLUMN cars_listings.selected_engine_id IS 'Seçilen motor ID si';
COMMENT ON COLUMN cars_listings.import_status IS 'İthalat durumu (Distürbütörü, Özel İthalat)';
COMMENT ON COLUMN cars_listings.main_image IS 'Ana resim URL si (genellikle seçilen renk resmi)';
COMMENT ON COLUMN cars_listings.images IS 'Ek resimler JSON array formatında';
COMMENT ON COLUMN cars_listings.status IS 'İlan durumu (pending, approved, rejected)';