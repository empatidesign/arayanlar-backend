-- Add selected_color_name column back to cars_listings table
-- Migration: Add selected_color_name for displaying color in listings
-- Date: 2025-01-23

BEGIN;

-- selected_color_name alanını geri ekle
ALTER TABLE cars_listings 
ADD COLUMN IF NOT EXISTS selected_color_name VARCHAR(50);

-- Yorum ekle
COMMENT ON COLUMN cars_listings.selected_color_name IS 'Seçilen rengin adı - ilan listelerinde gösterilmek için';

COMMIT;