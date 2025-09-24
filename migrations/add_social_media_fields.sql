-- Sosyal medya alanlarını users tablosuna ekleme
ALTER TABLE users 
ADD COLUMN instagram_url VARCHAR(255),
ADD COLUMN facebook_url VARCHAR(255),
ADD COLUMN whatsapp_url VARCHAR(255),
ADD COLUMN linkedin_url VARCHAR(255);