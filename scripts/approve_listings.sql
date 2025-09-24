-- Pending durumundaki tüm ilanları approved yap
UPDATE listings 
SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
WHERE status = 'pending';

-- Belirli ID'li ilanları approved yap
UPDATE listings 
SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
WHERE id IN (11, 12);

-- Tüm ilanların durumunu kontrol et
SELECT id, title, status, created_at, updated_at 
FROM listings 
ORDER BY id;
