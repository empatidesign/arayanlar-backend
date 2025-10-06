-- Migration: Update building_age column to VARCHAR to store categorical values
-- Date: 2025-01-23

-- Update building_age column type from INTEGER to VARCHAR
ALTER TABLE housing_listings ALTER COLUMN building_age TYPE VARCHAR(20);

-- Update existing numeric values to categorical format
UPDATE housing_listings 
SET building_age = CASE 
    WHEN building_age::INTEGER = 0 THEN '0'
    WHEN building_age::INTEGER >= 1 AND building_age::INTEGER <= 10 THEN '5-10'
    WHEN building_age::INTEGER > 10 THEN '10+'
    ELSE building_age
END
WHERE building_age IS NOT NULL AND building_age ~ '^[0-9]+$';