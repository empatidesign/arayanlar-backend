-- Add max_area column to housing_listings table
ALTER TABLE housing_listings 
ADD COLUMN IF NOT EXISTS max_area INTEGER;

-- Add comment to the column
COMMENT ON COLUMN housing_listings.max_area IS 'Maximum area in square meters';
