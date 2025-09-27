const db = require('../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer konfigürasyonu - renk resimleri için
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/color-images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'color-' + uniqueSuffix + path.extname(file.originalname));
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

// Renk resimlerini getir
const getColorImages = async (req, res) => {
  try {
    const { product_id, color_id } = req.query;
    
    let query = 'SELECT * FROM color_images WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (product_id) {
      query += ` AND product_id = $${paramIndex}`;
      params.push(product_id);
      paramIndex++;
    }
    
    if (color_id) {
      query += ` AND color_id = $${paramIndex}`;
      params.push(color_id);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at ASC';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      images: result.rows
    });
  } catch (error) {
    console.error('Renk resimleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Renk resimleri getirilirken hata oluştu'
    });
  }
};

// Renk resmi yükle
const uploadColorImage = async (req, res) => {
  try {
    const { product_id, color_id } = req.body;
    
    if (!product_id || !color_id) {
      return res.status(400).json({
        success: false,
        message: 'Ürün ID ve renk ID gerekli'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resim dosyası gerekli'
      });
    }
    
    // Ürün-renk kombinasyonunun var olup olmadığını kontrol et
    const productColorCheck = await db.query(
      'SELECT id FROM product_colors WHERE product_id = $1 AND color_id = $2',
      [product_id, color_id]
    );
    
    if (productColorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün-renk kombinasyonu bulunamadı'
      });
    }
    
    const imagePath = `/uploads/color-images/${req.file.filename}`;
    
    const result = await db.query(
      'INSERT INTO color_images (product_id, color_id, image_path) VALUES ($1, $2, $3) RETURNING *',
      [product_id, color_id, imagePath]
    );
    
    res.status(201).json({
      success: true,
      message: 'Renk resmi başarıyla yüklendi',
      image: result.rows[0]
    });
  } catch (error) {
    console.error('Renk resmi yüklenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Renk resmi yüklenirken hata oluştu'
    });
  }
};

// Renk resmini sil
const deleteColorImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut resmi kontrol et
    const existingImage = await db.query('SELECT * FROM color_images WHERE id = $1', [id]);
    
    if (existingImage.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Renk resmi bulunamadı'
      });
    }
    
    // Resim dosyasını sil
    const imagePath = existingImage.rows[0].image_path;
    if (imagePath) {
      const fullImagePath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(fullImagePath)) {
        fs.unlinkSync(fullImagePath);
      }
    }
    
    // Veritabanından sil
    await db.query('DELETE FROM color_images WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Renk resmi başarıyla silindi'
    });
  } catch (error) {
    console.error('Renk resmi silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Renk resmi silinirken hata oluştu'
    });
  }
};

// Tek renk resmini getir
const getColorImageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('SELECT * FROM color_images WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Renk resmi bulunamadı'
      });
    }
    
    res.json({
      success: true,
      image: result.rows[0]
    });
  } catch (error) {
    console.error('Renk resmi getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Renk resmi getirilirken hata oluştu'
    });
  }
};

module.exports = {
  upload,
  getColorImages,
  uploadColorImage,
  deleteColorImage,
  getColorImageById
};
