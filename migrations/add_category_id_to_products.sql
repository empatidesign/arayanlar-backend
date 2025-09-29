-- Migration: Add category_id column to products table
-- Date: 2024-01-21

-- Add category_id column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);

-- Add comment for documentation
COMMENT ON COLUMN products.category_id IS 'Foreign key reference to categories table';