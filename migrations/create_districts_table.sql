-- İlçeler tablosu - Konut ilanları için ilçe bilgileri
-- Migration: Create districts table
-- Date: 2025-01-23

CREATE TABLE IF NOT EXISTS districts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'İstanbul',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_districts_city ON districts(city);
CREATE INDEX IF NOT EXISTS idx_districts_active ON districts(is_active);
CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(name);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_districts_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_districts_updated_at 
    BEFORE UPDATE ON districts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_districts_updated_at_column();

-- İstanbul ilçelerini ekle
INSERT INTO districts (name, city) VALUES 
('Adalar', 'İstanbul'),
('Arnavutköy', 'İstanbul'),
('Ataşehir', 'İstanbul'),
('Avcılar', 'İstanbul'),
('Bağcılar', 'İstanbul'),
('Bahçelievler', 'İstanbul'),
('Bakırköy', 'İstanbul'),
('Başakşehir', 'İstanbul'),
('Bayrampaşa', 'İstanbul'),
('Beşiktaş', 'İstanbul'),
('Beykoz', 'İstanbul'),
('Beylikdüzü', 'İstanbul'),
('Beyoğlu', 'İstanbul'),
('Büyükçekmece', 'İstanbul'),
('Çatalca', 'İstanbul'),
('Çekmeköy', 'İstanbul'),
('Esenler', 'İstanbul'),
('Esenyurt', 'İstanbul'),
('Eyüpsultan', 'İstanbul'),
('Fatih', 'İstanbul'),
('Gaziosmanpaşa', 'İstanbul'),
('Güngören', 'İstanbul'),
('Kadıköy', 'İstanbul'),
('Kağıthane', 'İstanbul'),
('Kartal', 'İstanbul'),
('Küçükçekmece', 'İstanbul'),
('Maltepe', 'İstanbul'),
('Pendik', 'İstanbul'),
('Sancaktepe', 'İstanbul'),
('Sarıyer', 'İstanbul'),
('Silivri', 'İstanbul'),
('Sultanbeyli', 'İstanbul'),
('Sultangazi', 'İstanbul'),
('Şile', 'İstanbul'),
('Şişli', 'İstanbul'),
('Tuzla', 'İstanbul'),
('Ümraniye', 'İstanbul'),
('Üsküdar', 'İstanbul'),
('Zeytinburnu', 'İstanbul')
ON CONFLICT DO NOTHING;

-- Tablo yorumu
COMMENT ON TABLE districts IS 'İlçeler tablosu - konut ilanları için ilçe bilgileri';
COMMENT ON COLUMN districts.name IS 'İlçe adı';
COMMENT ON COLUMN districts.city IS 'İl adı';
COMMENT ON COLUMN districts.is_active IS 'İlçe aktif mi?';