-- Add gender field to watch product colors
-- Migration: Add gender field to colors JSON structure
-- Date: 2025-01-27

-- Bu migration colors JSON yapısına gender alanı ekler
-- Örnek yapı:
-- [
--   {
--     "name": "GÜMÜŞ",
--     "hex": "#C0C0C0",
--     "image": "/uploads/...",
--     "gender": "male"  -- veya "female" veya "unisex"
--   }
-- ]

-- Not: JSON içindeki verileri güncellemek için uygulama seviyesinde yapılmalı
-- Mevcut renkler için default olarak "unisex" değeri atanabilir

-- Mevcut renklere gender ekle (unisex olarak)
UPDATE watch_products
SET colors = (
  SELECT jsonb_agg(
    jsonb_set(
      color::jsonb,
      '{gender}',
      '"unisex"'::jsonb
    )
  )
  FROM jsonb_array_elements(colors::jsonb) AS color
)
WHERE colors IS NOT NULL 
  AND colors != '[]'
  AND colors::jsonb @> '[{}]'::jsonb
  AND NOT colors::jsonb @> '[{"gender": "male"}]'::jsonb
  AND NOT colors::jsonb @> '[{"gender": "female"}]'::jsonb
  AND NOT colors::jsonb @> '[{"gender": "unisex"}]'::jsonb;

-- Başarı mesajı
SELECT 'Gender alanı watch_products colors yapısına eklendi' as message;
