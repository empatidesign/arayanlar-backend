-- Migration: Add profile fields to users table
-- Date: 2024-01-20

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_end_date DATE,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);

-- Add comments for documentation
COMMENT ON COLUMN users.subscription_end_date IS 'User subscription end date';
COMMENT ON COLUMN users.birthday IS 'User birth date';
COMMENT ON COLUMN users.gender IS 'User gender (Erkek, Kadın, Diğer)';
COMMENT ON COLUMN users.city IS 'User city';
COMMENT ON COLUMN users.profile_image_url IS 'URL of user profile image';