-- Migration: Update products table to support multiple images, colors, and specifications
-- Date: 2024-01-20

-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';

-- Create indexes for better performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_products_images ON products USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_products_colors ON products USING GIN (colors);
CREATE INDEX IF NOT EXISTS idx_products_specifications ON products USING GIN (specifications);

-- Add comments for documentation
COMMENT ON COLUMN products.images IS 'Array of product image paths in JSON format';
COMMENT ON COLUMN products.colors IS 'Array of product colors with name and hex values in JSON format';
COMMENT ON COLUMN products.specifications IS 'Product specifications as key-value pairs in JSON format';

-- Example data structures:
-- images: ["/uploads/products/image1.jpg", "/uploads/products/image2.jpg"]
-- colors: [{"name": "Kırmızı", "hex": "#FF0000"}, {"name": "Mavi", "hex": "#0000FF"}]
-- specifications: {"Boyut": "Large", "Malzeme": "Çelik", "Garanti": "2 Yıl"}