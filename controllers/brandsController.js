const db = require('../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
const getAllBrands = async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let query = 'SELECT * FROM brands';
    let params = [];
    
    if (category_id) {
      query += ' WHERE category_id = $1';
      params.push(category_id);
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      brands: result.rows
    });
  } catch (error) {
    console.error('Markalar getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Markalar getirilirken hata oluştu'
    });
  }
};

// Tek marka getir
const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('SELECT * FROM brands WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marka bulunamadı'
      });
    }
    
    res.json({
      success: true,
      brand: result.rows[0]
    });
  } catch (error) {
    console.error('Marka getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Marka getirilirken hata oluştu'
    });
  }
};

// Yeni marka oluştur
const createBrand = async (req, res) => {
  try {
    const { name, category_id, description } = req.body;
    
    if (!name || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Marka adı ve kategori ID gerekli'
      });
    }
    
    // Logo dosyası varsa path'ini al
    const logo = req.file ? `/uploads/brands/${req.file.filename}` : null;
    
    const result = await db.query(
      'INSERT INTO brands (name, category_id, logo, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, category_id, logo, description]
    );
    
    res.status(201).json({
      success: true,
      message: 'Marka başarıyla oluşturuldu',
      brand: result.rows[0]
    });
  } catch (error) {
    console.error('Marka oluşturulurken hata:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Bu marka adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Marka oluşturulurken hata oluştu'
    });
  }
};

// Marka güncelle
const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, description } = req.body;
    
    // Mevcut markayı kontrol et
    const existingBrand = await db.query('SELECT * FROM brands WHERE id = $1', [id]);
    
    if (existingBrand.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marka bulunamadı'
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
    
    if (category_id) {
      updateFields.push(`category_id = $${paramIndex}`);
      values.push(category_id);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    // Yeni logo dosyası varsa
    if (req.file) {
      const newLogo = `/uploads/brands/${req.file.filename}`;
      updateFields.push(`logo = $${paramIndex}`);
      values.push(newLogo);
      paramIndex++;
      
      // Eski logo dosyasını sil
      const oldLogo = existingBrand.rows[0].logo;
      if (oldLogo) {
        const oldLogoPath = path.join(__dirname, '..', oldLogo);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
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
      UPDATE brands 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    res.json({
      success: true,
      message: 'Marka başarıyla güncellendi',
      brand: result.rows[0]
    });
  } catch (error) {
    console.error('Marka güncellenirken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu marka adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Marka güncellenirken hata oluştu'
    });
  }
};

// Marka sil
const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut markayı kontrol et
    const existingBrand = await db.query('SELECT * FROM brands WHERE id = $1', [id]);
    
    if (existingBrand.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marka bulunamadı'
      });
    }
    
    // Markaya bağlı ürün var mı kontrol et
    const productsCheck = await db.query('SELECT COUNT(*) as count FROM products WHERE brand_id = $1', [id]);
    
    if (parseInt(productsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu markaya bağlı ürünler bulunduğu için silinemez'
      });
    }
    
    // Logo dosyasını sil
    const logo = existingBrand.rows[0].logo;
    if (logo) {
      const logoPath = path.join(__dirname, '..', logo);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }
    
    // Markayı sil
    await db.query('DELETE FROM brands WHERE id = $1', [id]);
    
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
};

module.exports = {
  upload,
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand
};
