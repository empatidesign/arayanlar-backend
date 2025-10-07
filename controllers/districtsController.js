const db = require('../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer konfigürasyonu - ilçe resimleri için
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/districts');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'district-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
  }
});

// Tüm ilçeleri getir
const getDistricts = async (req, res) => {
  try {
    const { city } = req.query;
    
    let query = 'SELECT * FROM districts WHERE is_active = true';
    let params = [];
    
    if (city) {
      query += ' AND city = $1';
      params.push(city);
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await db.query(query, params);
    
    // Image path'lerini tam URL olarak döndür
    const districtsWithImageUrls = result.rows.map(district => ({
      ...district,
      image: district.image ? `/uploads/districts/${district.image}` : null
    }));
    
    res.json({
      success: true,
      data: districtsWithImageUrls,
      message: 'İlçeler başarıyla getirildi'
    });
  } catch (error) {
    console.error('İlçeler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlçeler getirilirken bir hata oluştu',
      error: error.message
    });
  }
};

// Belirli bir ilçeyi getir
const getDistrictById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM districts WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlçe bulunamadı'
      });
    }

    // Image path'ini tam URL olarak döndür
    const district = {
      ...result.rows[0],
      image: result.rows[0].image ? `/uploads/districts/${result.rows[0].image}` : null
    };
    
    res.json({
      success: true,
      data: district,
      message: 'İlçe başarıyla getirildi'
    });
  } catch (error) {
    console.error('İlçe getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlçe getirilirken bir hata oluştu',
      error: error.message
    });
  }
};

// İlçe ara
const searchDistricts = async (req, res) => {
  try {
    const { q, city } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Arama terimi en az 2 karakter olmalıdır'
      });
    }
    
    let query = 'SELECT * FROM districts WHERE is_active = true AND name ILIKE $1';
    let params = [`%${q.trim()}%`];
    
    if (city) {
      query += ' AND city = $2';
      params.push(city);
    }
    
    query += ' ORDER BY name ASC LIMIT 20';
    
    const result = await db.query(query, params);
    
    // Image path'lerini tam URL olarak döndür
    const districtsWithImageUrls = result.rows.map(district => ({
      ...district,
      image: district.image ? `/uploads/districts/${district.image}` : null
    }));
    
    res.json({
      success: true,
      data: districtsWithImageUrls,
      message: 'Arama sonuçları getirildi'
    });
  } catch (error) {
    console.error('İlçe arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Arama sırasında bir hata oluştu',
      error: error.message
    });
  }
};

// İstanbul ilçelerini getir (mobil uygulama için özel)
const getIstanbulDistricts = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, city, image FROM districts WHERE city = $1 AND is_active = true ORDER BY name ASC',
      ['İstanbul']
    );
    
    // Image path'lerini tam URL olarak döndür
    const districtsWithImageUrls = result.rows.map(district => ({
      ...district,
      image: district.image ? `/uploads/districts/${district.image}` : null
    }));
    
    res.json({
      success: true,
      data: districtsWithImageUrls,
      message: 'İstanbul ilçeleri başarıyla getirildi'
    });
  } catch (error) {
    console.error('İstanbul ilçeleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İstanbul ilçeleri getirilirken bir hata oluştu',
      error: error.message
    });
  }
};

// Yeni ilçe oluştur
const createDistrict = async (req, res) => {
  try {
    const { name, city } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'İlçe adı gerekli'
      });
    }
    
    let imagePath = null;
    if (req.file) {
      imagePath = req.file.filename;
    }
    
    const result = await db.query(
      'INSERT INTO districts (name, city, image) VALUES ($1, $2, $3) RETURNING *',
      [name, city || 'İstanbul', imagePath]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'İlçe başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error('İlçe oluşturulurken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu ilçe adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'İlçe oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
};

// İlçe güncelle
const updateDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'İlçe adı gerekli'
      });
    }
    
    // Mevcut ilçeyi kontrol et
    const existingDistrict = await db.query(
      'SELECT * FROM districts WHERE id = $1',
      [id]
    );
    
    if (existingDistrict.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlçe bulunamadı'
      });
    }
    
    let imagePath = existingDistrict.rows[0].image;
    
    // Yeni resim yüklendiyse
    if (req.file) {
      // Eski resmi sil
      if (imagePath) {
        const oldImagePath = path.join(__dirname, '../uploads/districts', imagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = req.file.filename;
    }
    
    const result = await db.query(
      'UPDATE districts SET name = $1, city = $2, image = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, city || 'İstanbul', imagePath, id]
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'İlçe başarıyla güncellendi'
    });
  } catch (error) {
    console.error('İlçe güncellenirken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu ilçe adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'İlçe güncellenirken bir hata oluştu',
      error: error.message
    });
  }
};

// İlçe sil
const deleteDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut ilçeyi kontrol et
    const existingDistrict = await db.query(
      'SELECT * FROM districts WHERE id = $1',
      [id]
    );
    
    if (existingDistrict.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlçe bulunamadı'
      });
    }
    
    // İlçeyi soft delete yap (is_active = false)
    await db.query(
      'UPDATE districts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: 'İlçe başarıyla silindi'
    });
  } catch (error) {
    console.error('İlçe silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlçe silinirken bir hata oluştu',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  getDistricts,
  getDistrictById,
  searchDistricts,
  getIstanbulDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict
};