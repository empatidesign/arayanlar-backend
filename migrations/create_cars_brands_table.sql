-- Araba markaları tablosu - Vasıta ilanları için
-- Migration: Create cars_brands table
-- Date: 2025-01-23

CREATE TABLE IF NOT EXISTS cars_brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(500),
    country VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_cars_brands_name ON cars_brands(name);
CREATE INDEX IF NOT EXISTS idx_cars_brands_active ON cars_brands(is_active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_cars_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cars_brands_updated_at 
    BEFORE UPDATE ON cars_brands 
    FOR EACH ROW 
    EXECUTE FUNCTION update_cars_brands_updated_at();

-- Popüler araba markalarını ekle
INSERT INTO cars_brands (name, country, logo_url) VALUES 
('Audi', 'Almanya', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=100&h=100&fit=crop'),
('BMW', 'Almanya', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=100&h=100&fit=crop'),
('Mercedes-Benz', 'Almanya', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=100&h=100&fit=crop'),
('Volkswagen', 'Almanya', 'https://images.unsplash.com/photo-1622353219448-46a009f0d44f?w=100&h=100&fit=crop'),
('Ford', 'ABD', 'https://images.unsplash.com/photo-1612825173281-9a193378527e?w=100&h=100&fit=crop'),
('Chevrolet', 'ABD', 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=100&h=100&fit=crop'),
('Toyota', 'Japonya', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=100&h=100&fit=crop'),
('Honda', 'Japonya', 'https://images.unsplash.com/photo-1618843479619-f3d0d81e4d10?w=100&h=100&fit=crop'),
('Nissan', 'Japonya', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=100&h=100&fit=crop'),
('Mazda', 'Japonya', 'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=100&h=100&fit=crop'),
('Hyundai', 'Güney Kore', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=100&h=100&fit=crop'),
('Kia', 'Güney Kore', 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=100&h=100&fit=crop'),
('Renault', 'Fransa', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=100&h=100&fit=crop'),
('Peugeot', 'Fransa', 'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=100&h=100&fit=crop'),
('Citroën', 'Fransa', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=100&h=100&fit=crop'),
('Fiat', 'İtalya', 'https://images.unsplash.com/photo-1612825173281-9a193378527e?w=100&h=100&fit=crop'),
('Alfa Romeo', 'İtalya', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=100&h=100&fit=crop'),
('Lancia', 'İtalya', 'https://images.unsplash.com/photo-1622353219448-46a009f0d44f?w=100&h=100&fit=crop'),
('Skoda', 'Çek Cumhuriyeti', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=100&h=100&fit=crop'),
('Seat', 'İspanya', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=100&h=100&fit=crop'),
('Volvo', 'İsveç', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=100&h=100&fit=crop'),
('Saab', 'İsveç', 'https://images.unsplash.com/photo-1618843479619-f3d0d81e4d10?w=100&h=100&fit=crop'),
('Opel', 'Almanya', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=100&h=100&fit=crop'),
('Dacia', 'Romanya', 'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=100&h=100&fit=crop'),
('Tofaş', 'Türkiye', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=100&h=100&fit=crop'),
('Karsan', 'Türkiye', 'https://images.unsplash.com/photo-1612825173281-9a193378527e?w=100&h=100&fit=crop'),
('Otokar', 'Türkiye', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=100&h=100&fit=crop'),
('Mitsubishi', 'Japonya', 'https://images.unsplash.com/photo-1622353219448-46a009f0d44f?w=100&h=100&fit=crop'),
('Subaru', 'Japonya', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=100&h=100&fit=crop'),
('Suzuki', 'Japonya', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=100&h=100&fit=crop'),
('Isuzu', 'Japonya', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=100&h=100&fit=crop'),
('Lexus', 'Japonya', 'https://images.unsplash.com/photo-1618843479619-f3d0d81e4d10?w=100&h=100&fit=crop'),
('Infiniti', 'Japonya', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=100&h=100&fit=crop'),
('Acura', 'Japonya', 'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=100&h=100&fit=crop'),
('Genesis', 'Güney Kore', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=100&h=100&fit=crop'),
('Mini', 'İngiltere', 'https://images.unsplash.com/photo-1612825173281-9a193378527e?w=100&h=100&fit=crop'),
('Land Rover', 'İngiltere', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=100&h=100&fit=crop'),
('Jaguar', 'İngiltere', 'https://images.unsplash.com/photo-1622353219448-46a009f0d44f?w=100&h=100&fit=crop'),
('Bentley', 'İngiltere', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=100&h=100&fit=crop'),
('Rolls-Royce', 'İngiltere', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=100&h=100&fit=crop'),
('Aston Martin', 'İngiltere', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=100&h=100&fit=crop'),
('McLaren', 'İngiltere', 'https://images.unsplash.com/photo-1618843479619-f3d0d81e4d10?w=100&h=100&fit=crop'),
('Ferrari', 'İtalya', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=100&h=100&fit=crop'),
('Lamborghini', 'İtalya', 'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=100&h=100&fit=crop'),
('Maserati', 'İtalya', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=100&h=100&fit=crop'),
('Porsche', 'Almanya', 'https://images.unsplash.com/photo-1612825173281-9a193378527e?w=100&h=100&fit=crop'),
('Tesla', 'ABD', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=100&h=100&fit=crop'),
('Cadillac', 'ABD', 'https://images.unsplash.com/photo-1622353219448-46a009f0d44f?w=100&h=100&fit=crop'),
('Lincoln', 'ABD', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=100&h=100&fit=crop'),
('Buick', 'ABD', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=100&h=100&fit=crop'),
('GMC', 'ABD', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=100&h=100&fit=crop'),
('Jeep', 'ABD', 'https://images.unsplash.com/photo-1618843479619-f3d0d81e4d10?w=100&h=100&fit=crop'),
('Chrysler', 'ABD', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=100&h=100&fit=crop'),
('Dodge', 'ABD', 'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=100&h=100&fit=crop'),
('Ram', 'ABD', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=100&h=100&fit=crop')
ON CONFLICT (name) DO NOTHING;

-- Yorumlar
COMMENT ON TABLE cars_brands IS 'Araba markaları tablosu - vasıta ilanları için';
COMMENT ON COLUMN cars_brands.name IS 'Marka adı';
COMMENT ON COLUMN cars_brands.logo_url IS 'Marka logosu URL si';
COMMENT ON COLUMN cars_brands.country IS 'Markanın menşei ülkesi';
COMMENT ON COLUMN cars_brands.is_active IS 'Markanın aktif olup olmadığı';