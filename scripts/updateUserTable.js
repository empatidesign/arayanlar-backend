require('dotenv').config();
const { pool } = require('../services/database');

const updateUserTable = async () => {
  try {
    console.log('🔄 User tablosunu güncelleniyor...');
    
    const alterTableQueries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date DATE;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;'
    ];

    for (const query of alterTableQueries) {
      await pool.query(query);
      console.log('✅ Kolon eklendi:', query);
    }

    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);',
      'CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);'
    ];

    for (const query of indexQueries) {
      await pool.query(query);
      console.log('✅ İndeks oluşturuldu:', query);
    }

    console.log('✅ User tablosu başarıyla güncellendi!');
    
  } catch (error) {
    console.error('❌ Tablo güncelleme hatası:', error);
  } finally {
    await pool.end();
  }
};

updateUserTable();