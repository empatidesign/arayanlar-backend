const db = require('./services/database');

async function fixCategories() {
  try {
    console.log('Kategoriler düzeltiliyor...');

    // Eksik kategorileri ekle
    const categories = [
      { name: 'Saat', image: '/uploads/sections/saat.jpg' },
      { name: 'Konut', image: '/uploads/sections/konut.jpg' },
      { name: 'Vasıta', image: '/uploads/sections/vasita.jpg' }
    ];

    for (const category of categories) {
      const query = `
        INSERT INTO sections (name, image) 
        VALUES ($1, $2) 
        ON CONFLICT (name) DO UPDATE SET image = $2
        RETURNING id, name
      `;
      
      const result = await db.query(query, [category.name, category.image]);
      console.log(`✅ Kategori: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }

    // Mevcut kategorileri listele
    const listQuery = 'SELECT id, name FROM sections ORDER BY id';
    const listResult = await db.query(listQuery);
    
    console.log('\n📋 Mevcut kategoriler:');
    listResult.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Name: ${row.name}`);
    });

  } catch (error) {
    console.error('❌ Kategori düzeltme hatası:', error);
  } finally {
    process.exit(0);
  }
}

fixCategories();