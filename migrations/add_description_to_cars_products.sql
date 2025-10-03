-- Add description column to cars_products table
-- Migration: Add description column for car model descriptions
-- Date: 2025-01-23

ALTER TABLE cars_products 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN cars_products.description IS 'Description of the car model';