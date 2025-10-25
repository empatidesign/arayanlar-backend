-- Mevcut password_reset_tokens tablosunu 6 haneli doğrulama kodu sistemine güncelle
-- Önce mevcut verileri temizle
DELETE FROM password_reset_tokens;

-- token_hash sütununu verification_code olarak yeniden adlandır ve boyutunu değiştir
ALTER TABLE password_reset_tokens 
DROP COLUMN IF EXISTS token_hash;

ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);

-- Eski index'i kaldır ve yenisini ekle
DROP INDEX IF EXISTS idx_password_reset_tokens_token_hash;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_verification_code ON password_reset_tokens(verification_code);