-- Migration: Add selected_color_id column to cars_listings table
-- Date: 2025-01-23
-- Description: Add selected_color_id column to store the ID of the selected color for car listings

-- Add selected_color_id column
ALTER TABLE cars_listings 
ADD COLUMN IF NOT EXISTS selected_color_id VARCHAR(50);

-- Add comment for the new column
COMMENT ON COLUMN cars_listings.selected_color_id IS 'Seçilen rengin ID si (örn: color-1, color-2)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cars_listings_selected_color_id ON cars_listings(selected_color_id);

-- Update existing records to have a default selected_color_id if needed
-- This is optional and can be customized based on business requirements
-- UPDATE cars_listings SET selected_color_id = 'color-1' WHERE selected_color_id IS NULL;