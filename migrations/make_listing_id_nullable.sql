-- Migration: Make listing_id nullable in conversations table
-- This allows user-based conversations without requiring a listing_id

-- First, drop the NOT NULL constraint on listing_id
ALTER TABLE conversations ALTER COLUMN listing_id DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN conversations.listing_id IS 'Optional listing ID - can be NULL for user-based conversations';

-- Create an index for better performance on nullable listing_id queries
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id) WHERE listing_id IS NOT NULL;