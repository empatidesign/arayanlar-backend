-- Favoriler tablosunu oluştur
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id) -- Aynı kullanıcı aynı ilanı birden fazla kez favorilere ekleyemez
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at);

-- Yorum ekle
COMMENT ON TABLE favorites IS 'Kullanıcıların favori ilanları';
COMMENT ON COLUMN favorites.user_id IS 'Favoriyi ekleyen kullanıcının ID si';
COMMENT ON COLUMN favorites.listing_id IS 'Favoriye eklenen ilanın ID si';
COMMENT ON COLUMN favorites.created_at IS 'Favoriye eklenme tarihi';