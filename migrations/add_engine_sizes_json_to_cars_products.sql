-- Add engine_sizes JSON column to cars_products table
-- Migration: Convert single engine_size to multiple engine_sizes JSON array
-- Date: 2025-01-23

-- Add new engine_sizes JSON column
ALTER TABLE cars_products 
ADD COLUMN IF NOT EXISTS engine_sizes TEXT;

-- Migrate existing engine_size data to engine_sizes JSON format
UPDATE cars_products 
SET engine_sizes = CASE 
    WHEN engine_size IS NOT NULL AND engine_size != '' THEN 
        '[{"size": "' || engine_size || '"}]'
    ELSE 
        '[{"size": "1.6"}, {"size": "2.0"}]'
END
WHERE engine_sizes IS NULL OR engine_sizes = '';

-- Update specific models with multiple engine options
-- Audi A3 - Multiple engine options
UPDATE cars_products 
SET engine_sizes = '[
    {"size": "1.4 TFSI"},
    {"size": "1.6 TDI"},
    {"size": "2.0 TFSI"},
    {"size": "2.0 TDI"}
]'
WHERE name = 'A3' AND brand_id = 1;

-- Audi A4 - Multiple engine options
UPDATE cars_products 
SET engine_sizes = '[
    {"size": "1.8 TFSI"},
    {"size": "2.0 TFSI"},
    {"size": "2.0 TDI"},
    {"size": "3.0 TDI"}
]'
WHERE name = 'A4' AND brand_id = 1;

-- Audi A6 - Multiple engine options
UPDATE cars_products 
SET engine_sizes = '[
    {"size": "2.0 TFSI"},
    {"size": "2.8 FSI"},
    {"size": "2.0 TDI"},
    {"size": "3.0 TDI"}
]'
WHERE name = 'A6' AND brand_id = 1;

-- Add comment
COMMENT ON COLUMN cars_products.engine_sizes IS 'JSON array of engine size variants for the car model';

-- Note: Keep the old engine_size column for backward compatibility
-- It can be removed in a future migration after all code is updated