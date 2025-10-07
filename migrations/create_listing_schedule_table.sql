-- İlan verme saatlerini yönetmek için tablo
CREATE TABLE IF NOT EXISTS listing_schedule (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL, -- 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
  start_time TIME NOT NULL, -- Başlangıç saati (HH:MM formatında)
  end_time TIME NOT NULL, -- Bitiş saati (HH:MM formatında)
  is_active BOOLEAN DEFAULT TRUE, -- Aktif/pasif durumu
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Varsayılan değerler (Pazartesi-Cuma 09:00-18:00)
INSERT INTO listing_schedule (day_of_week, start_time, end_time, is_active) VALUES
(1, '09:00', '18:00', TRUE), -- Pazartesi
(2, '09:00', '18:00', TRUE), -- Salı
(3, '09:00', '18:00', TRUE), -- Çarşamba
(4, '09:00', '18:00', TRUE), -- Perşembe
(5, '09:00', '18:00', TRUE), -- Cuma
(6, '10:00', '16:00', FALSE), -- Cumartesi (kapalı)
(0, '10:00', '16:00', FALSE); -- Pazar (kapalı)