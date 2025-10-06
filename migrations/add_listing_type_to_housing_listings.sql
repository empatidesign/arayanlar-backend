-- Housing listings tablosuna listing_type alanı ekle
-- Migration: Add listing_type to housing_listings table
-- Date: 2025-01-23

-- listing_type alanını ekle (satilik veya kiralik)
ALTER TABLE housing_listings 
ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) DEFAULT 'satilik';

-- listing_type için check constraint ekle
ALTER TABLE housing_listings 
ADD CONSTRAINT chk_listing_type 
CHECK (listing_type IN ('satilik', 'kiralik'));

-- listing_type için index ekle
CREATE INDEX IF NOT EXISTS idx_housing_listings_listing_type 
ON housing_listings(listing_type);

-- Yorum ekle
COMMENT ON COLUMN housing_listings.listing_type IS 'İlan tipi (satilik veya kiralik)';