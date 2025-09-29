-- Users tablosuna role kolonu ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Role için index ekle
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);