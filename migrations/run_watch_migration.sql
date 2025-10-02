-- Saat ilanları için migration'ı çalıştır
-- Bu script sadece alan isimlerini değiştirir, hiçbir veri kaybı olmaz

\i rename_fields_for_watch_listings.sql

-- Migration tamamlandı mesajı
SELECT 'Saat ilanları için alan isimleri başarıyla güncellendi!' as message;