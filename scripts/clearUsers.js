const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'arayanvar',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function clearUsers() {
  try {
    console.log('Kullanıcı kayıtları temizleniyor...');
    
    const result = await pool.query('DELETE FROM users');
    
    console.log(`✅ ${result.rowCount} kullanıcı kaydı silindi`);
    console.log('Veritabanı temizlendi, yeni kayıtlar için hazır');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

clearUsers();