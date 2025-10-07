-- Kullanıcı başına ilan limiti sistemi için tablo
CREATE TABLE IF NOT EXISTS listing_limits (
  id SERIAL PRIMARY KEY,
  daily_limit INTEGER NOT NULL DEFAULT 50, -- Günlük ilan limiti
  is_active BOOLEAN DEFAULT TRUE, -- Aktif/pasif durumu
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kullanıcı başına günlük ilan sayacı tablosu
CREATE TABLE IF NOT EXISTS user_daily_listing_count (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  listing_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Hangi gün için sayaç
  count INTEGER DEFAULT 0, -- O gün verilen ilan sayısı
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Bir kullanıcının bir günde sadece bir kaydı olsun
  UNIQUE(user_id, listing_date)
);

-- Varsayılan limit değeri (50 ilan)
INSERT INTO listing_limits (daily_limit, is_active) VALUES (50, TRUE);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_user_daily_count_user_date ON user_daily_listing_count(user_id, listing_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_count_date ON user_daily_listing_count(listing_date);