-- iOS ve Android için ayrı versiyon alanları ekle
ALTER TABLE app_versions 
ADD COLUMN IF NOT EXISTS current_version_ios VARCHAR(20),
ADD COLUMN IF NOT EXISTS minimum_version_ios VARCHAR(20),
ADD COLUMN IF NOT EXISTS current_version_android VARCHAR(20),
ADD COLUMN IF NOT EXISTS minimum_version_android VARCHAR(20);

-- Mevcut verileri yeni alanlara kopyala
UPDATE app_versions 
SET 
    current_version_ios = current_version,
    minimum_version_ios = minimum_version,
    current_version_android = current_version,
    minimum_version_android = minimum_version
WHERE current_version_ios IS NULL;

-- Eski alanları NULL yapılabilir hale getir (NOT NULL constraint'i kaldır)
ALTER TABLE app_versions 
ALTER COLUMN current_version DROP NOT NULL,
ALTER COLUMN minimum_version DROP NOT NULL;

-- Veya eski alanları tamamen kaldırmak isterseniz (önerilir):
-- ALTER TABLE app_versions DROP COLUMN IF EXISTS current_version;
-- ALTER TABLE app_versions DROP COLUMN IF EXISTS minimum_version;
