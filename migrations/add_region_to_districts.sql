-- İlçeler tablosuna region kolonu ekle
-- Migration: Add region column to districts table
-- Date: 2025-12-01

-- Region kolonu ekle (ASYA veya AVRUPA)
ALTER TABLE districts 
ADD COLUMN IF NOT EXISTS region VARCHAR(20) CHECK (region IN ('ASYA', 'AVRUPA'));

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_districts_region ON districts(region);

-- Mevcut ilçeleri güncelle - Avrupa Yakası
UPDATE districts SET region = 'AVRUPA' 
WHERE name IN (
  'Arnavutköy', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 
  'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beylikdüzü', 'Beyoğlu', 
  'Büyükçekmece', 'Çatalca', 'Esenler', 'Esenyurt', 'Eyüpsultan', 
  'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kağıthane', 'Küçükçekmece', 
  'Sarıyer', 'Silivri', 'Sultangazi', 'Şişli', 'Zeytinburnu'
);

-- Mevcut ilçeleri güncelle - Asya Yakası
UPDATE districts SET region = 'ASYA' 
WHERE name IN (
  'Adalar', 'Ataşehir', 'Beykoz', 'Çekmeköy', 'Kadıköy', 
  'Kartal', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sultanbeyli', 
  'Şile', 'Tuzla', 'Ümraniye', 'Üsküdar'
);

-- Tablo yorumu
COMMENT ON COLUMN districts.region IS 'İlçenin bölgesi (ASYA veya AVRUPA)';
