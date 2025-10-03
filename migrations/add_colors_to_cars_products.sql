-- Add colors column to cars_products table
-- Migration: Add colors column for car color variants
-- Date: 2025-01-23

ALTER TABLE cars_products 
ADD COLUMN IF NOT EXISTS colors TEXT;

-- Add image_url column if it doesn't exist
ALTER TABLE cars_products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing records with default colors if needed
UPDATE cars_products 
SET colors = '[{"name": "Beyaz", "hex": "#FFFFFF", "image": null}, {"name": "Siyah", "hex": "#000000", "image": null}, {"name": "Gri", "hex": "#808080", "image": null}]'
WHERE colors IS NULL OR colors = '';

-- Add comment
COMMENT ON COLUMN cars_products.colors IS 'JSON array of color variants for the car model';
COMMENT ON COLUMN cars_products.image_url IS 'Main image URL for the car model';