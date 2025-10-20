const db = require('../../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Admin yetki kontrolü middleware
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli'
      });
    }

    const query = 'SELECT role FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisi gerekli'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin yetki kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Multer konfigürasyonu - slider resimleri için
const sliderStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/sliders');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'slider-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Slider upload middleware
const sliderUpload = multer({ 
  storage: sliderStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ===== SLIDER YÖNETİMİ FONKSİYONLARI =====

// Yeni slider oluştur
const createSlider = async (req, res) => {
  try {
    const { title, category, order_index = 1, is_active = true } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve kategori zorunludur'
      });
    }

    let image_url = null;
    if (req.file) {
      image_url = `/uploads/sliders/${req.file.filename}`;
    }

    const query = `
      INSERT INTO sliders (title, category, order_index, is_active, image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [title, category, parseInt(order_index), is_active === 'true' || is_active === true, image_url]);
    
    res.status(201).json({
      success: true,
      message: 'Slider başarıyla oluşturuldu',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Slider oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Slider oluşturulurken hata oluştu'
    });
  }
};

// Slider güncelle
const updateSlider = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, order_index, is_active } = req.body;
    
    // Mevcut slider'ı kontrol et
    const existingQuery = 'SELECT * FROM sliders WHERE id = $1';
    const existingResult = await db.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    let image_url = existingResult.rows[0].image_url;
    
    // Yeni resim yüklendiyse
    if (req.file) {
      // Eski resmi sil
      if (image_url) {
        const oldImagePath = path.join(__dirname, '../..', image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image_url = `/uploads/sliders/${req.file.filename}`;
    }

    const query = `
      UPDATE sliders 
      SET title = $1, category = $2, order_index = $3, is_active = $4, image_url = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await db.query(query, [
      title || existingResult.rows[0].title,
      category || existingResult.rows[0].category,
      order_index !== undefined ? parseInt(order_index) : existingResult.rows[0].order_index,
      is_active !== undefined ? (is_active === 'true' || is_active === true) : existingResult.rows[0].is_active,
      image_url,
      id
    ]);
    
    res.json({
      success: true,
      message: 'Slider başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Slider güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Slider güncellenirken hata oluştu'
    });
  }
};

// Slider sil
const deleteSlider = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut slider'ı kontrol et
    const existingQuery = 'SELECT * FROM sliders WHERE id = $1';
    const existingResult = await db.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    // Resim dosyasını sil
    if (existingResult.rows[0].image_url) {
      const imagePath = path.join(__dirname, '../..', existingResult.rows[0].image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    const query = 'DELETE FROM sliders WHERE id = $1';
    await db.query(query, [id]);
    
    res.json({
      success: true,
      message: 'Slider başarıyla silindi'
    });
  } catch (error) {
    console.error('Slider silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Slider silinirken hata oluştu'
    });
  }
};

// Slider sıralarını güncelle
const updateSliderOrder = async (req, res) => {
  try {
    const { orders } = req.body; // [{ id: 1, order_index: 2 }, { id: 2, order_index: 1 }]
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sıra verisi'
      });
    }

    // Transaction başlat
    await db.query('BEGIN');
    
    try {
      for (const order of orders) {
        const query = 'UPDATE sliders SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
        await db.query(query, [order.order_index, order.id]);
      }
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Slider sıraları başarıyla güncellendi'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Slider sıraları güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Slider sıraları güncellenirken hata oluştu'
    });
  }
};

module.exports = {
  requireAdmin,
  sliderUpload,
  createSlider,
  updateSlider,
  deleteSlider,
  updateSliderOrder
};