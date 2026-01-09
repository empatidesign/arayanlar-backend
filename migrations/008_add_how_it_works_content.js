const db = require('../services/database');

async function up() {
  console.log('Adding how_it_works content...');
  
  await db.query(`
    INSERT INTO app_content (key, title, content, is_active) VALUES
    ('how_it_works', 'Nasıl Çalışır?', '<h2>Nasıl Çalışır?</h2><p>ArayanVar platformunu kullanarak kayıp eşyalarınızı kolayca bulabilir veya bulduğunuz eşyaları sahiplerine ulaştırabilirsiniz.</p><h3>Adım 1: Kayıt Olun</h3><p>Google hesabınızla hızlıca giriş yapın.</p><h3>Adım 2: İlan Verin</h3><p>Kaybettiğiniz veya bulduğunuz eşyayı detaylı bir şekilde tanımlayın.</p><h3>Adım 3: Eşleşmeleri Takip Edin</h3><p>Sistem otomatik olarak benzer ilanları size bildirir.</p>', true)
    ON CONFLICT (key) DO NOTHING
  `);

  console.log('✅ how_it_works content added successfully');
}

async function down() {
  console.log('Removing how_it_works content...');
  await db.query("DELETE FROM app_content WHERE key = 'how_it_works'");
  console.log('✅ how_it_works content removed');
}

module.exports = { up, down };
