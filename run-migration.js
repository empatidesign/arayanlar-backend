const fs = require('fs');
const path = require('path');
const db = require('./services/database');

async function runMigration() {
  try {
    console.log('Migration başlatılıyor...');
    
    // Komut satırından migration dosya adını al
    const migrationFile = process.argv[2] || '007_create_app_content.js';
    
    // Migration dosyasını yükle
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration dosyası bulunamadı: ${migrationFile}`);
    }
    
    // .js dosyası ise require ile yükle
    if (migrationFile.endsWith('.js')) {
      const migration = require(migrationPath);
      
      if (typeof migration.up === 'function') {
        await migration.up();
        console.log(`✅ Migration başarıyla çalıştırıldı: ${migrationFile}`);
      } else {
        throw new Error('Migration dosyasında up() fonksiyonu bulunamadı');
      }
    } else {
      // .sql dosyası ise doğrudan çalıştır
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await db.query(migrationSQL);
      console.log(`✅ Migration başarıyla çalıştırıldı: ${migrationFile}`);
    }
    
  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();