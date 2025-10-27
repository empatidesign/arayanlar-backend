const db = require('../../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Admin yetki kontrolü middleware
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token gerekli'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (!user.rows[0] || user.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisi gerekli'
      });
    }

    req.user = user.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz token'
    });
  }
};

// Multer konfigürasyonu - kategori resimleri için
const sectionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/sections');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'section-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Kategori upload middleware
const upload = multer({ 
  storage: sectionStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  }
});

// Yeni kategori oluştur
const createSection = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Kategori adı gerekli'
      });
    }
    
    // Kategori resmi varsa path'ini al
    const image = req.file ? `/uploads/sections/${req.file.filename}` : null;
    
    const result = await db.query(
      'INSERT INTO sections (name, image) VALUES ($1, $2) RETURNING *',
      [name, image]
    );
    
    res.status(201).json({
      success: true,
      message: 'Kategori başarıyla oluşturuldu',
      section: result.rows[0]
    });
  } catch (error) {
    console.error('Kategori oluşturulurken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu kategori adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Kategori oluşturulurken hata oluştu'
    });
  }
};

// Kategori güncelle
const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Mevcut kategoriyi kontrol et
    const existingSection = await db.query('SELECT * FROM sections WHERE id = $1', [id]);
    
    if (existingSection.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }
    
    // Güncellenecek alanları belirle
    let updateFields = [];
    let values = [];
    let paramIndex = 1;
    
    if (name) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    
    // Yeni resim dosyası varsa
    if (req.file) {
      const newImage = `/uploads/sections/${req.file.filename}`;
      updateFields.push(`image = $${paramIndex}`);
      values.push(newImage);
      paramIndex++;
      
      // Eski resim dosyasını sil
      const oldImage = existingSection.rows[0].image;
      if (oldImage) {
        const oldImagePath = path.join(__dirname, '../..', oldImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
      UPDATE sections 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    res.json({
      success: true,
      message: 'Kategori başarıyla güncellendi',
      section: result.rows[0]
    });
  } catch (error) {
    console.error('Kategori güncellenirken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu kategori adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Kategori güncellenirken hata oluştu'
    });
  }
};

// Kategori sil
const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut kategoriyi kontrol et
    const existingSection = await db.query('SELECT * FROM sections WHERE id = $1', [id]);
    
    if (existingSection.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }
    
    // Kategoriye bağlı marka var mı kontrol et
    const brandsCheck = await db.query('SELECT COUNT(*) as count FROM brands WHERE category_id = $1', [id]);
    
    if (parseInt(brandsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu kategoriye bağlı markalar bulunduğu için silinemez'
      });
    }
    
    // Kategoriye bağlı ilan var mı kontrol göster
    const listingsCheck = await db.query('SELECT COUNT(*) as count FROM watch_listings WHERE category_id = $1', [id]);
    
    if (parseInt(listingsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu kategoriye bağlı ilanlar bulunduğu için silinemez'
      });
    }
    
    // Resim dosyasını sil
    const image = existingSection.rows[0].image;
    if (image) {
      const imagePath = path.join(__dirname, '../..', image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Kategoriyi sil
    await db.query('DELETE FROM sections WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Kategori başarıyla silindi'
    });
  } catch (error) {
    console.error('Kategori silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori silinirken hata oluştu'
    });
  }
};

module.exports = {
  requireAdmin,
  upload,
  createSection,
  updateSection,
  deleteSection
};