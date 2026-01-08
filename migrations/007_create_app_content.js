const db = require('../services/database');

async function up() {
  console.log('Creating app_content table...');
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_content (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tek bir içerik ekle
  await db.query(`
    INSERT INTO app_content (key, title, content) VALUES
    ('terms_and_privacy', 'Kullanım Şartları ve Gizlilik Politikası', '<h2>Kullanım Şartları</h2><p>Uygulamamızı kullanarak aşağıdaki şartları kabul etmiş olursunuz...</p><br/><h2>Gizlilik Politikası</h2><p>Kişisel verilerinizin korunması bizim için önemlidir...</p>')
    ON CONFLICT (key) DO UPDATE SET 
      title = EXCLUDED.title,
      content = EXCLUDED.content
  `);

  console.log('✅ app_content table created successfully');
}

async function down() {
  console.log('Dropping app_content table...');
  await db.query('DROP TABLE IF EXISTS app_content');
  console.log('✅ app_content table dropped');
}

module.exports = { up, down };
