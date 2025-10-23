-- App versions tablosunu oluştur
CREATE TABLE IF NOT EXISTS app_versions (
    id SERIAL PRIMARY KEY,
    current_version VARCHAR(20) NOT NULL,
    minimum_version VARCHAR(20) NOT NULL,
    force_update BOOLEAN DEFAULT FALSE,
    update_message TEXT,
    download_url_android TEXT,
    download_url_ios TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Varsayılan versiyon bilgisi ekle
INSERT INTO app_versions (
    current_version, 
    minimum_version, 
    force_update, 
    update_message, 
    download_url_android, 
    download_url_ios,
    is_active
) VALUES (
    '1.0.0', 
    '1.0.0', 
    FALSE, 
    'Yeni özellikler ve hata düzeltmeleri mevcut. Uygulamayı güncelleyin!', 
    'https://play.google.com/store/apps/details?id=com.arayanvar',
    'https://apps.apple.com/app/arayanvar/id123456789',
    TRUE
);