-- Add order_index to districts and initialize alphabetically
ALTER TABLE districts ADD COLUMN IF NOT EXISTS order_index INTEGER;

WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY name ASC) AS rn
  FROM districts
)
UPDATE districts d
SET order_index = o.rn
FROM ordered o
WHERE d.id = o.id AND d.order_index IS NULL;

CREATE INDEX IF NOT EXISTS idx_districts_order_index ON districts(order_index);