-- Migration: Add order_index to cars_brands and initialize values
-- Date: 2025-10-27

ALTER TABLE cars_brands ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Initialize order_index based on current alphabetical order if null
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) AS rn
  FROM cars_brands
)
UPDATE cars_brands cb
SET order_index = o.rn
FROM ordered o
WHERE cb.id = o.id AND cb.order_index IS NULL;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_cars_brands_order_index ON cars_brands(order_index);