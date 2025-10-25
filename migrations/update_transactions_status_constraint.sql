-- İşlemler tablosu status constraint'ini güncelle
-- Migration: Update transactions table status constraint to include new status values
-- Date: 2025-01-25

BEGIN;

-- Mevcut constraint'i kaldır
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Yeni constraint'i ekle (cancelled ve refunded dahil)
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
    CHECK (status IN ('completed', 'pending', 'failed', 'cancelled', 'refunded'));

COMMIT;