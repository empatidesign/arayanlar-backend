const express = require('express');
const router = express.Router();
const db = require('../services/database');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/sections/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'section-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.get('/', async (req, res) => {
  try {
    const sections = await db.query(`
      SELECT id, name, image, created_at 
      FROM sections 
      ORDER BY created_at DESC
    `);
    res.json(sections.rows);
  } catch (error) {
    console.error('Bölümler getirilirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Bölüm adı gerekli' });
    }

    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/sections/${req.file.filename}`;
    }

    const result = await db.query(
      'INSERT INTO sections (name, image) VALUES ($1, $2)',
      [name, imagePath]
    );

    const newSection = {
      id: result.insertId,
      name,
      image: imagePath
    };

    res.status(201).json(newSection);
  } catch (error) {
    console.error('Bölüm ekleme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut bölümü kontrol et
    const section = await db.query('SELECT * FROM sections WHERE id = $1', [id]);
    if (section.rows.length === 0) {
      return res.status(404).json({ error: 'Bölüm bulunamadı' });
    }

    // İlişkili ilanları kontrol et
    const relatedListings = await db.query('SELECT COUNT(*) as count FROM listings WHERE category_id = $1', [id]);
    if (relatedListings.rows[0].count > 0) {
      return res.status(400).json({ error: 'Bu kategoriye ait ilanlar bulunduğu için silinemez' });
    }

    // İlişkili markaları kontrol et
    const relatedBrands = await db.query('SELECT COUNT(*) as count FROM brands WHERE category_id = $1', [id]);
    if (relatedBrands.rows[0].count > 0) {
      return res.status(400).json({ error: 'Bu kategoriye ait markalar bulunduğu için silinemez' });
    }

    // Bölümü sil
    await db.query('DELETE FROM sections WHERE id = $1', [id]);
    res.json({ message: 'Kategori başarıyla silindi' });
  } catch (error) {
    console.error('Kategori silinirken hata:', error);
    res.status(500).json({ error: 'Kategori silinemedi' });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Bölüm adı gerekli' });
    }

    // Mevcut bölümü kontrol et
    const existingSection = await db.query('SELECT * FROM sections WHERE id = $1', [id]);
    if (existingSection.rows.length === 0) {
      return res.status(404).json({ error: 'Bölüm bulunamadı' });
    }

    let imagePath = existingSection.rows[0].image;
    
    // Yeni resim yüklendiyse
    if (req.file) {
      imagePath = '/uploads/sections/' + req.file.filename;
    }

    await db.query(
      'UPDATE sections SET name = $1, image = $2 WHERE id = $3',
      [name, imagePath, id]
    );

    const updatedSection = await db.query('SELECT * FROM sections WHERE id = $1', [id]);
    res.json(updatedSection.rows[0]);
  } catch (error) {
    console.error('Bölüm güncelleme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;