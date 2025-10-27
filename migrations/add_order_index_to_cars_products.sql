-- Migration: Add order_index to cars_products and initialize values per brand
-- Date: 2025-10-27

ALTER TABLE cars_products ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Initialize order_index based on current alphabetical order within each brand if null
WITH ordered AS (
  SELECT id, brand_id, ROW_NUMBER() OVER (PARTITION BY brand_id ORDER BY name ASC) AS rn
  FROM cars_products
)
UPDATE cars_products cp
SET order_index = o.rn
FROM ordered o
WHERE cp.id = o.id AND cp.order_index IS NULL;

-- Create indexes for ordering and brand-specific queries
CREATE INDEX IF NOT EXISTS idx_cars_products_brand_order_index ON cars_products(brand_id, order_index);
CREATE INDEX IF NOT EXISTS idx_cars_products_order_index ON cars_products(order_index);