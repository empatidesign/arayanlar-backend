const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'arayanvar',
  password: '123',
  port: 5432,
});

async function checkModels() {
  try {
    // ID 86 olan modeli kontrol et
    console.log('=== ID 86 Model Kontrolü ===');
    const result86 = await pool.query('SELECT * FROM car_models WHERE id = $1', [86]);
    if (result86.rows.length > 0) {
      console.log('ID 86 model bulundu:', result86.rows[0]);
    } else {
      console.log('ID 86 model bulunamadı!');
    }
    
    // ID 87 olan modeli kontrol et (kullanıcının verdiği örnek)
    console.log('\n=== ID 87 Model Kontrolü ===');
    const result87 = await pool.query('SELECT * FROM car_models WHERE id = $1', [87]);
    if (result87.rows.length > 0) {
      console.log('ID 87 model bulundu:', result87.rows[0]);
    } else {
      console.log('ID 87 model bulunamadı!');
    }
    
    // Tüm modelleri listele
    console.log('\n=== Tüm Modeller ===');
    const allModels = await pool.query('SELECT id, name, brand_id FROM car_models ORDER BY id');
    console.log('Toplam model sayısı:', allModels.rows.length);
    allModels.rows.forEach(model => {
      console.log(`ID: ${model.id}, Name: ${model.name}, Brand ID: ${model.brand_id}`);
    });
    
  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkModels();