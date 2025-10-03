-- Araba modelleri tablosu - Vasıta ilanları için
-- Migration: Create cars_products table
-- Date: 2025-01-23

CREATE TABLE IF NOT EXISTS cars_products (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES cars_brands(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    model_year_start INTEGER,
    model_year_end INTEGER,
    body_type VARCHAR(50), -- Sedan, Hatchback, SUV, Coupe, Convertible, Wagon, Pickup, Van
    fuel_type VARCHAR(30), -- Benzin, Dizel, Hibrit, Elektrik, LPG, CNG
    transmission VARCHAR(20), -- Manuel, Otomatik, Yarı Otomatik
    engine_size VARCHAR(20), -- 1.6, 2.0, 3.0 vs
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_cars_products_brand ON cars_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_cars_products_name ON cars_products(name);
CREATE INDEX IF NOT EXISTS idx_cars_products_body_type ON cars_products(body_type);
CREATE INDEX IF NOT EXISTS idx_cars_products_fuel_type ON cars_products(fuel_type);
CREATE INDEX IF NOT EXISTS idx_cars_products_active ON cars_products(is_active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_cars_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cars_products_updated_at 
    BEFORE UPDATE ON cars_products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_cars_products_updated_at();

-- Popüler araba modellerini ekle (brand_id'ler cars_brands tablosundaki sıraya göre)

-- Audi modelleri (brand_id: 1)
INSERT INTO cars_products (brand_id, name, model_year_start, model_year_end, body_type, fuel_type, transmission, engine_size) VALUES 
(1, 'A3', 1996, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.4'),
(1, 'A4', 1994, NULL, 'Sedan', 'Benzin', 'Otomatik', '2.0'),
(1, 'A6', 1994, NULL, 'Sedan', 'Dizel', 'Otomatik', '3.0'),
(1, 'A8', 1994, NULL, 'Sedan', 'Benzin', 'Otomatik', '4.0'),
(1, 'Q3', 2011, NULL, 'SUV', 'Benzin', 'Otomatik', '2.0'),
(1, 'Q5', 2008, NULL, 'SUV', 'Dizel', 'Otomatik', '2.0'),
(1, 'Q7', 2005, NULL, 'SUV', 'Dizel', 'Otomatik', '3.0'),
(1, 'TT', 1998, NULL, 'Coupe', 'Benzin', 'Manuel', '2.0'),

-- BMW modelleri (brand_id: 2)
(2, '1 Serisi', 2004, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.6'),
(2, '3 Serisi', 1975, NULL, 'Sedan', 'Benzin', 'Otomatik', '2.0'),
(2, '5 Serisi', 1972, NULL, 'Sedan', 'Dizel', 'Otomatik', '2.0'),
(2, '7 Serisi', 1977, NULL, 'Sedan', 'Benzin', 'Otomatik', '3.0'),
(2, 'X1', 2009, NULL, 'SUV', 'Benzin', 'Otomatik', '2.0'),
(2, 'X3', 2003, NULL, 'SUV', 'Dizel', 'Otomatik', '2.0'),
(2, 'X5', 1999, NULL, 'SUV', 'Dizel', 'Otomatik', '3.0'),
(2, 'X6', 2008, NULL, 'SUV', 'Benzin', 'Otomatik', '3.0'),

-- Mercedes-Benz modelleri (brand_id: 3)
(3, 'A-Class', 1997, NULL, 'Hatchback', 'Benzin', 'Otomatik', '1.6'),
(3, 'C-Class', 1993, NULL, 'Sedan', 'Benzin', 'Otomatik', '2.0'),
(3, 'E-Class', 1953, NULL, 'Sedan', 'Dizel', 'Otomatik', '2.0'),
(3, 'S-Class', 1972, NULL, 'Sedan', 'Benzin', 'Otomatik', '3.0'),
(3, 'GLA', 2013, NULL, 'SUV', 'Benzin', 'Otomatik', '2.0'),
(3, 'GLC', 2015, NULL, 'SUV', 'Dizel', 'Otomatik', '2.0'),
(3, 'GLE', 2015, NULL, 'SUV', 'Dizel', 'Otomatik', '3.0'),
(3, 'G-Class', 1979, NULL, 'SUV', 'Benzin', 'Otomatik', '4.0'),

-- Volkswagen modelleri (brand_id: 4)
(4, 'Golf', 1974, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.4'),
(4, 'Polo', 1975, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.2'),
(4, 'Passat', 1973, NULL, 'Sedan', 'Dizel', 'Otomatik', '2.0'),
(4, 'Jetta', 1979, NULL, 'Sedan', 'Benzin', 'Otomatik', '1.6'),
(4, 'Tiguan', 2007, NULL, 'SUV', 'Benzin', 'Otomatik', '2.0'),
(4, 'Touareg', 2002, NULL, 'SUV', 'Dizel', 'Otomatik', '3.0'),
(4, 'Caddy', 1980, NULL, 'Van', 'Dizel', 'Manuel', '2.0'),

-- Ford modelleri (brand_id: 5)
(5, 'Fiesta', 1976, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.0'),
(5, 'Focus', 1998, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.6'),
(5, 'Mondeo', 1993, NULL, 'Sedan', 'Dizel', 'Otomatik', '2.0'),
(5, 'Mustang', 1964, NULL, 'Coupe', 'Benzin', 'Otomatik', '5.0'),
(5, 'Kuga', 2008, NULL, 'SUV', 'Benzin', 'Otomatik', '2.0'),
(5, 'Explorer', 1990, NULL, 'SUV', 'Benzin', 'Otomatik', '3.5'),
(5, 'Transit', 1965, NULL, 'Van', 'Dizel', 'Manuel', '2.2'),

-- Toyota modelleri (brand_id: 7)
(7, 'Corolla', 1966, NULL, 'Sedan', 'Benzin', 'Otomatik', '1.6'),
(7, 'Camry', 1982, NULL, 'Sedan', 'Benzin', 'Otomatik', '2.5'),
(7, 'Prius', 1997, NULL, 'Hatchback', 'Hibrit', 'Otomatik', '1.8'),
(7, 'RAV4', 1994, NULL, 'SUV', 'Benzin', 'Otomatik', '2.0'),
(7, 'Highlander', 2000, NULL, 'SUV', 'Benzin', 'Otomatik', '3.5'),
(7, 'Land Cruiser', 1951, NULL, 'SUV', 'Dizel', 'Otomatik', '4.5'),
(7, 'Yaris', 1999, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.3'),

-- Honda modelleri (brand_id: 8)
(8, 'Civic', 1972, NULL, 'Sedan', 'Benzin', 'Otomatik', '1.6'),
(8, 'Accord', 1976, NULL, 'Sedan', 'Benzin', 'Otomatik', '2.4'),
(8, 'CR-V', 1995, NULL, 'SUV', 'Benzin', 'Otomatik', '2.0'),
(8, 'HR-V', 1998, NULL, 'SUV', 'Benzin', 'Otomatik', '1.8'),
(8, 'Pilot', 2002, NULL, 'SUV', 'Benzin', 'Otomatik', '3.5'),
(8, 'Jazz', 2001, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.3'),

-- Renault modelleri (brand_id: 13)
(13, 'Clio', 1990, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.2'),
(13, 'Megane', 1995, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.6'),
(13, 'Fluence', 2009, 2016, 'Sedan', 'Benzin', 'Otomatik', '1.6'),
(13, 'Kadjar', 2015, NULL, 'SUV', 'Dizel', 'Otomatik', '1.5'),
(13, 'Captur', 2013, NULL, 'SUV', 'Benzin', 'Otomatik', '1.2'),
(13, 'Talisman', 2015, NULL, 'Sedan', 'Dizel', 'Otomatik', '1.6'),

-- Fiat modelleri (brand_id: 16)
(16, 'Punto', 1993, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.2'),
(16, 'Egea', 2015, NULL, 'Sedan', 'Benzin', 'Manuel', '1.4'),
(16, '500', 2007, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.2'),
(16, 'Doblo', 2000, NULL, 'Van', 'Dizel', 'Manuel', '1.6'),
(16, 'Linea', 2007, 2018, 'Sedan', 'Benzin', 'Manuel', '1.4'),

-- Hyundai modelleri (brand_id: 11)
(11, 'i10', 2007, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.0'),
(11, 'i20', 2008, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.2'),
(11, 'i30', 2007, NULL, 'Hatchback', 'Benzin', 'Otomatik', '1.6'),
(11, 'Elantra', 1990, NULL, 'Sedan', 'Benzin', 'Otomatik', '1.6'),
(11, 'Tucson', 2004, NULL, 'SUV', 'Dizel', 'Otomatik', '2.0'),
(11, 'Santa Fe', 2000, NULL, 'SUV', 'Dizel', 'Otomatik', '2.2'),

-- Opel modelleri (brand_id: 23)
(23, 'Corsa', 1982, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.2'),
(23, 'Astra', 1991, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.4'),
(23, 'Insignia', 2008, NULL, 'Sedan', 'Dizel', 'Otomatik', '2.0'),
(23, 'Mokka', 2012, NULL, 'SUV', 'Benzin', 'Otomatik', '1.4'),
(23, 'Crossland', 2017, NULL, 'SUV', 'Benzin', 'Otomatik', '1.2'),

-- Peugeot modelleri (brand_id: 14)
(14, '208', 2012, NULL, 'Hatchback', 'Benzin', 'Manuel', '1.2'),
(14, '308', 2007, NULL, 'Hatchback', 'Benzin', 'Otomatik', '1.6'),
(14, '508', 2010, NULL, 'Sedan', 'Dizel', 'Otomatik', '2.0'),
(14, '2008', 2013, NULL, 'SUV', 'Benzin', 'Otomatik', '1.2'),
(14, '3008', 2008, NULL, 'SUV', 'Dizel', 'Otomatik', '1.6'),
(14, '5008', 2009, NULL, 'SUV', 'Dizel', 'Otomatik', '2.0')

ON CONFLICT DO NOTHING;

-- Yorumlar
COMMENT ON TABLE cars_products IS 'Araba modelleri tablosu - vasıta ilanları için';
COMMENT ON COLUMN cars_products.brand_id IS 'Marka ID si (cars_brands tablosuna referans)';
COMMENT ON COLUMN cars_products.name IS 'Model adı';
COMMENT ON COLUMN cars_products.model_year_start IS 'Modelin üretilmeye başlandığı yıl';
COMMENT ON COLUMN cars_products.model_year_end IS 'Modelin üretimden kalktığı yıl (NULL ise hala üretiliyor)';
COMMENT ON COLUMN cars_products.body_type IS 'Kasa tipi (Sedan, Hatchback, SUV, vb.)';
COMMENT ON COLUMN cars_products.fuel_type IS 'Yakıt tipi (Benzin, Dizel, Hibrit, vb.)';
COMMENT ON COLUMN cars_products.transmission IS 'Şanzıman tipi (Manuel, Otomatik, vb.)';
COMMENT ON COLUMN cars_products.engine_size IS 'Motor hacmi';
COMMENT ON COLUMN cars_products.is_active IS 'Modelin aktif olup olmadığı';