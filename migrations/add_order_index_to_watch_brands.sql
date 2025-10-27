-- Add order_index to watch_brands and initialize based on alphabetical name
ALTER TABLE watch_brands ADD COLUMN IF NOT EXISTS order_index INTEGER;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) AS rn
  FROM watch_brands
)
UPDATE watch_brands wb
SET order_index = o.rn
FROM ordered o
WHERE wb.id = o.id AND wb.order_index IS NULL;

CREATE INDEX IF NOT EXISTS idx_watch_brands_order_index ON watch_brands(order_index);