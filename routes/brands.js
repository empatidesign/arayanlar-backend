const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../services/database');

// Multer konfigürasyonu - marka logoları için
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/brands');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'brand-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Tüm markaları getir
router.get('/', async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let query = 'SELECT * FROM brands';
    let params = [];
    
    if (category_id) {
      query += ' WHERE category_id = $1';
      params.push(category_id);
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);
    const brands = result.rows;
    
    res.json({
      success: true,
      brands: brands
    });
  } catch (error) {
    console.error('Markalar getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Markalar getirilirken hata oluştu'
    });
  }
});

// Belirli bir markayı getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM brands WHERE id = $1',
      [id]
    );
    const brands = result.rows;
    
    if (brands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marka bulunamadı'
      });
    }
    
    res.json({
      success: true,
      brand: brands[0]
    });
  } catch (error) {
    console.error('Marka getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Marka getirilirken hata oluştu'
    });
  }
});

// Yeni marka ekle
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category_id } = req.body;
    
    if (!name || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Marka adı ve kategori ID gerekli'
      });
    }
    
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/brands/${req.file.filename}`;
    }
    
    const result = await pool.query(
      'INSERT INTO brands (name, category_id, image, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [name, category_id, imagePath]
    );
    
    const newBrand = result.rows[0];
    
    res.status(201).json({
      success: true,
      message: 'Marka başarıyla eklendi',
      brand: newBrand
    });
  } catch (error) {
    console.error('Marka eklenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Marka eklenirken hata oluştu'
    });
  }
});

// Marka güncelle
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id } = req.body;
    
    // Mevcut markayı kontrol et
    const result = await pool.query(
      'SELECT * FROM brands WHERE id = $1',
      [id]
    );
    const existingBrands = result.rows;
    
    if (existingBrands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marka bulunamadı'
      });
    }
    
    let imagePath = existingBrands[0].image;
    
    // Yeni resim yüklendiyse
    if (req.file) {
      // Eski resmi sil
      if (existingBrands[0].image) {
        const oldImagePath = path.join(__dirname, '..', existingBrands[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = `/uploads/brands/${req.file.filename}`;
    }
    
    const updateResult = await pool.query(
      'UPDATE brands SET name = $1, category_id = $2, image = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name || existingBrands[0].name, category_id || existingBrands[0].category_id, imagePath, id]
    );
    
    const updatedBrand = updateResult.rows[0];
    
    res.json({
      success: true,
      message: 'Marka başarıyla güncellendi',
      brand: updatedBrand
    });
  } catch (error) {
    console.error('Marka güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Marka güncellenirken hata oluştu'
    });
  }
});

// Marka sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut markayı kontrol et
    const result = await pool.query(
      'SELECT * FROM brands WHERE id = $1',
      [id]
    );
    const existingBrands = result.rows;
    
    if (existingBrands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marka bulunamadı'
      });
    }
    
    // Resim dosyasını sil
    if (existingBrands[0].image) {
      const imagePath = path.join(__dirname, '..', existingBrands[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await pool.query('DELETE FROM brands WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Marka başarıyla silindi'
    });
  } catch (error) {
    console.error('Marka silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Marka silinirken hata oluştu'
    });
  }
});

module.exports = router;