-- Migration: Make phone column nullable for Google Sign-In users
-- Date: 2025-12-04

-- Make phone column nullable
ALTER TABLE users 
ALTER COLUMN phone DROP NOT NULL;

-- Update existing Google Sign-In users (those with G-prefixed phone numbers)
UPDATE users 
SET phone = NULL 
WHERE phone LIKE 'G%' AND LENGTH(phone) = 19;

-- Add comment
COMMENT ON COLUMN users.phone IS 'Phone number - nullable for Google Sign-In users';
