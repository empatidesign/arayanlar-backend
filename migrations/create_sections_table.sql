CREATE TABLE IF NOT EXISTS sections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sections (name, image) VALUES 
('Vasıta', 'https://images.unsplash.com/photo-1494976688153-d4d2529d4ca7?w=200&h=200&fit=crop'),
('Konut', 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=200&h=200&fit=crop'),
('Saat', 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=200&h=200&fit=crop')
ON CONFLICT (name) DO NOTHING;