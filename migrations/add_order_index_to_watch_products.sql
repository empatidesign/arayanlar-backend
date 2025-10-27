-- Add order_index to watch_products and initialize within each brand alphabetically
ALTER TABLE watch_products ADD COLUMN IF NOT EXISTS order_index INTEGER;

WITH ordered AS (
  SELECT id, brand_id,
         ROW_NUMBER() OVER (PARTITION BY brand_id ORDER BY name ASC) AS rn
  FROM watch_products
)
UPDATE watch_products wp
SET order_index = o.rn
FROM ordered o
WHERE wp.id = o.id AND wp.order_index IS NULL;

CREATE INDEX IF NOT EXISTS idx_watch_products_brand_order_index ON watch_products(brand_id, order_index);
CREATE INDEX IF NOT EXISTS idx_watch_products_order_index ON watch_products(order_index);