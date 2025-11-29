-- Migration: Update price field precision to support larger values
-- Date: 2025-01-28
-- Description: Increase price field precision from DECIMAL(12,2) to DECIMAL(15,2)
--              to support prices up to 1 trillion (1 trilyon)

-- Update cars_listings table
ALTER TABLE cars_listings 
ALTER COLUMN price TYPE DECIMAL(15,2);

-- Drop old constraint
ALTER TABLE cars_listings 
DROP CONSTRAINT IF EXISTS chk_price_positive;

-- Add new constraint - price must be less than 1 trillion (not equal)
ALTER TABLE cars_listings 
ADD CONSTRAINT chk_price_positive CHECK (price > 0 AND price < 1000000000000);

-- Update other listing tables if they exist
ALTER TABLE IF EXISTS housing_listings 
ALTER COLUMN price TYPE DECIMAL(15,2);

ALTER TABLE IF EXISTS housing_listings 
DROP CONSTRAINT IF EXISTS chk_price_positive;

ALTER TABLE IF EXISTS housing_listings 
ADD CONSTRAINT chk_price_positive CHECK (price > 0 AND price < 1000000000000);

ALTER TABLE IF EXISTS watch_listings 
ALTER COLUMN price TYPE DECIMAL(15,2);

ALTER TABLE IF EXISTS watch_listings 
DROP CONSTRAINT IF EXISTS chk_price_positive;

ALTER TABLE IF EXISTS watch_listings 
ADD CONSTRAINT chk_price_positive CHECK (price > 0 AND price < 1000000000000);

ALTER TABLE IF EXISTS listings 
ALTER COLUMN price TYPE DECIMAL(15,2);

-- Update package_price fields as well
ALTER TABLE IF EXISTS cars_listings 
ALTER COLUMN package_price TYPE DECIMAL(15,2);

ALTER TABLE IF EXISTS housing_listings 
ALTER COLUMN package_price TYPE DECIMAL(15,2);

ALTER TABLE IF EXISTS watch_listings 
ALTER COLUMN package_price TYPE DECIMAL(15,2);

COMMENT ON COLUMN cars_listings.price IS 'Fiyat (DECIMAL(15,2) - 1 trilyonun altında olmalı)';
