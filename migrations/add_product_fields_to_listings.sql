-- Listings tablosuna product, brand ve color alanlarını ekle
DO $$
BEGIN
    -- product_id alanını ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='product_id') THEN
        ALTER TABLE listings ADD COLUMN product_id INTEGER;
    END IF;
    
    -- brand_id alanını ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='brand_id') THEN
        ALTER TABLE listings ADD COLUMN brand_id INTEGER;
    END IF;
    
    -- color_id alanını ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='color_id') THEN
        ALTER TABLE listings ADD COLUMN color_id INTEGER;
    END IF;
END $$;

-- Foreign key constraints ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_listings_brand') THEN
        ALTER TABLE listings ADD CONSTRAINT fk_listings_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
    END IF;
END $$;

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_listings_product ON listings(product_id);
CREATE INDEX IF NOT EXISTS idx_listings_brand ON listings(brand_id);
CREATE INDEX IF NOT EXISTS idx_listings_color ON listings(color_id);