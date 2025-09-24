const fs = require('fs');
const path = require('path');
const db = require('./services/database');

async function runMigration() {
  try {
    console.log('Migration başlatılıyor...');
    
    // Komut satırından migration dosya adını al
    const migrationFile = process.argv[2] || 'create_listings_table.sql';
    
    // Migration dosyasını oku
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration dosyası bulunamadı: ${migrationFile}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // SQL komutlarını çalıştır
    await db.query(migrationSQL);
    
    console.log(`✅ Migration başarıyla çalıştırıldı: ${migrationFile}`);
    
  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();