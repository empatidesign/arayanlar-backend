-- Blocked Users tablosu - Kullanıcıların birbirini engellemesi için
CREATE TABLE IF NOT EXISTS blocked_users (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Aynı kullanıcı çiftinin birden fazla kez engellenmesini önle
    UNIQUE(blocker_id, blocked_id),
    
    -- Kullanıcının kendisini engellemesini önle
    CHECK (blocker_id != blocked_id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_pair ON blocked_users(blocker_id, blocked_id);

-- Yorumlar
COMMENT ON TABLE blocked_users IS 'Kullanıcıların birbirini engellemesi için tablo';
COMMENT ON COLUMN blocked_users.blocker_id IS 'Engelleyen kullanıcının ID si';
COMMENT ON COLUMN blocked_users.blocked_id IS 'Engellenen kullanıcının ID si';