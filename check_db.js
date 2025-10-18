const db = require('./services/database');

async function checkData() {
  try {
    console.log('=== VERİTABANI KONTROL ===');
    
    // Watch listings kontrol
    const watchResult = await db.query(`
      SELECT id, title, created_at, status, 
             EXTRACT(DAY FROM NOW() - created_at) as days_old
      FROM watch_listings 
      WHERE status = 'approved' AND is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📱 WATCH LISTINGS:');
    watchResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Başlık: ${row.title}, Yaş: ${Math.floor(row.days_old)} gün, Tarih: ${row.created_at}`);
    });
    
    // Car listings kontrol
    const carResult = await db.query(`
      SELECT id, title, created_at, status,
             EXTRACT(DAY FROM NOW() - created_at) as days_old
      FROM cars_listings 
      WHERE status = 'approved' AND is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n🚗 CAR LISTINGS:');
    carResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Başlık: ${row.title}, Yaş: ${Math.floor(row.days_old)} gün, Tarih: ${row.created_at}`);
    });
    
    // Housing listings kontrol
    const housingResult = await db.query(`
      SELECT id, title, created_at, status,
             EXTRACT(DAY FROM NOW() - created_at) as days_old
      FROM housing_listings 
      WHERE status = 'approved' AND is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n🏠 HOUSING LISTINGS:');
    housingResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Başlık: ${row.title}, Yaş: ${Math.floor(row.days_old)} gün, Tarih: ${row.created_at}`);
    });
    
    // 7 günden eski ilanları say
    const oldWatchCount = await db.query(`
      SELECT COUNT(*) as count
      FROM watch_listings 
      WHERE status = 'approved' AND is_active = true
        AND created_at <= NOW() - INTERVAL '7 days'
    `);
    
    const oldCarCount = await db.query(`
      SELECT COUNT(*) as count
      FROM cars_listings 
      WHERE status = 'approved' AND is_active = true
        AND created_at <= NOW() - INTERVAL '7 days'
    `);
    
    const oldHousingCount = await db.query(`
      SELECT COUNT(*) as count
      FROM housing_listings 
      WHERE status = 'approved' AND is_active = true
        AND created_at <= NOW() - INTERVAL '7 days'
    `);
    
    console.log('\n⏰ 7 GÜNDEN ESKİ İLANLAR:');
    console.log(`Watch: ${oldWatchCount.rows[0].count} adet`);
    console.log(`Car: ${oldCarCount.rows[0].count} adet`);
    console.log(`Housing: ${oldHousingCount.rows[0].count} adet`);
    
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

checkData();