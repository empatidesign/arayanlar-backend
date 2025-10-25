-- İşlemler tablosunu oluştur (uzatma ödemeleri için)
-- Migration: Create transactions table for extension payments
-- Date: 2025-01-23

BEGIN;

-- Transactions tablosunu oluştur
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL,
    listing_title VARCHAR(255) NOT NULL,
    listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('car', 'watch', 'housing')),
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'extension' CHECK (transaction_type IN ('extension', 'premium', 'boost')),
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    extension_days INTEGER DEFAULT 7,
    old_expiry_date TIMESTAMP,
    new_expiry_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    payment_method VARCHAR(50) DEFAULT 'credit_card',
    payment_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_listing_type ON transactions(listing_type);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_date ON transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Yorumlar ekle
COMMENT ON TABLE transactions IS 'Kullanıcı işlemleri tablosu (uzatma ödemeleri, premium paketler vb.)';
COMMENT ON COLUMN transactions.user_id IS 'İşlemi yapan kullanıcı ID si';
COMMENT ON COLUMN transactions.listing_id IS 'İşlem yapılan ilan ID si';
COMMENT ON COLUMN transactions.listing_title IS 'İlan başlığı (işlem anında)';
COMMENT ON COLUMN transactions.listing_type IS 'İlan türü (car, watch, housing)';
COMMENT ON COLUMN transactions.transaction_type IS 'İşlem türü (extension, premium, boost)';
COMMENT ON COLUMN transactions.amount IS 'İşlem tutarı (TL)';
COMMENT ON COLUMN transactions.payment_date IS 'Ödeme tarihi';
COMMENT ON COLUMN transactions.extension_days IS 'Uzatma gün sayısı (uzatma işlemleri için)';
COMMENT ON COLUMN transactions.old_expiry_date IS 'Eski bitiş tarihi';
COMMENT ON COLUMN transactions.new_expiry_date IS 'Yeni bitiş tarihi';
COMMENT ON COLUMN transactions.status IS 'İşlem durumu (completed, pending, failed)';
COMMENT ON COLUMN transactions.payment_method IS 'Ödeme yöntemi';
COMMENT ON COLUMN transactions.payment_reference IS 'Ödeme referans numarası';

COMMIT;