-- İlanlar tablosu - Tüm kategoriler için tek tablo
CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES sections(id) ON DELETE RESTRICT,
  
  -- Ortak alanlar
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'TL',
  
  -- Konum bilgileri
  location_city VARCHAR(100),
  location_district VARCHAR(100),
  location_address TEXT,
  
  -- Medya
  images JSONB DEFAULT '[]', -- ["image1.jpg", "image2.jpg"]
  main_image VARCHAR(500),
  
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
  
  -- Kategori-spesifik veriler (JSON formatında)
  category_data JSONB DEFAULT '{}',
  
  -- Zaman bilgileri
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  
  -- Moderasyon
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason TEXT
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location_city, location_district);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active, status);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_expires ON listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_urgent ON listings(is_urgent) WHERE is_urgent = true;

-- JSONB indeksleri
CREATE INDEX IF NOT EXISTS idx_listings_category_data ON listings USING GIN (category_data);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_listings_updated_at 
    BEFORE UPDATE ON listings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Örnek kategori-spesifik veriler:

-- SAAT için category_data örneği:
-- {
--   "brand": "PATEK PHILIPPE",
--   "model": "Nautilus",
--   "case_material": "Çelik",
--   "strap_material": "Çelik",
--   "condition": "Sıfır",
--   "warranty": true,
--   "box_papers": true
-- }

-- KONUT için category_data örneği:
-- {
--   "property_type": "Daire",
--   "room_count": "3+1",
--   "square_meters": 120,
--   "floor": 5,
--   "total_floors": 8,
--   "building_age": 3,
--   "heating": "Kombi",
--   "balcony": true,
--   "furnished": false,
--   "deed_status": "Kat Mülkiyeti"
-- }

-- VASITA için category_data örneği:
-- {
--   "brand": "AUDI",
--   "model": "A6",
--   "year": 2020,
--   "km": 45000,
--   "fuel_type": "Benzin",
--   "gear": "Otomatik",
--   "engine_size": "2.0",
--   "engine_power": "190 HP",
--   "color": "Siyah",
--   "damage_record": false,
--   "exchange": true
-- }