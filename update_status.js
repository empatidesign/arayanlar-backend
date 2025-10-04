const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'arayanvar',
  password: '123',
  port: 5432
});

async function updateStatus() {
  try {
    const result = await pool.query(
      "UPDATE cars_listings SET status = 'pending' WHERE status = 'pending'"
    );
    console.log('Güncellenen kayıt sayısı:', result.rowCount);
    
    // Güncellenmiş değerleri kontrol et
    const checkResult = await pool.query('SELECT DISTINCT status FROM cars_listings');
    console.log('Güncellenmiş status değerleri:', checkResult.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('Güncelleme hatası:', err);
    process.exit(1);
  }
}

updateStatus();