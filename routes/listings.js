const express = require('express');
const router = express.Router();
const db = require('../services/database');
const { authenticateToken: auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/listings');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'listing-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Maksimum 10 resim
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
  }
});

// Tüm ilanları getir (sayfalama ile)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category_id, 
      city, 
      min_price, 
      max_price, 
      is_urgent,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    let whereConditions = ['l.is_active = true'];
    let queryParams = [];
    let paramIndex = 1;

    if (category_id) {
      whereConditions.push(`l.category_id = $${paramIndex}`);
      queryParams.push(category_id);
      paramIndex++;
    }

    if (city) {
      whereConditions.push(`l.location_city ILIKE $${paramIndex}`);
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    if (min_price) {
      whereConditions.push(`l.price >= $${paramIndex}`);
      queryParams.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      whereConditions.push(`l.price <= $${paramIndex}`);
      queryParams.push(max_price);
      paramIndex++;
    }

    if (is_urgent === 'true') {
      whereConditions.push('l.is_urgent = true');
    }

    const whereClause = whereConditions.join(' AND ');
    
    const query = `
      SELECT 
        l.*,
        s.name as category_name,
        u.name as user_name,
        u.phone as user_phone
      FROM listings l
      JOIN sections s ON l.category_id = s.id
      JOIN users u ON l.user_id = u.id
      WHERE ${whereClause}
      ORDER BY l.${sort} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Toplam sayı için ayrı sorgu
    const countQuery = `
      SELECT COUNT(*) as total
      FROM listings l
      WHERE ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('İlanları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlanlar getirilirken hata oluştu'
    });
  }
});

// Tek ilan getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        l.*,
        s.name as category_name,
        u.name as user_name,
        u.phone as user_phone,
        u.profile_image_url as user_avatar
      FROM listings l
      JOIN sections s ON l.category_id = s.id
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1 AND l.is_active = true
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    // Görüntülenme sayısını artır
    await db.query(
      'UPDATE listings SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('İlan getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan getirilirken hata oluştu'
    });
  }
});

// Yeni ilan oluştur
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const {
      product_id,
      brand_id,
      category_id,
      color_id,
      title,
      description,
      price,
      currency = 'TL',
      location_city,
      location_district,
      location_address,
      contact_phone,
      contact_email,
      contact_whatsapp,
      is_urgent = false,
      category_data = '{}',
      images: frontendImages,
      main_image: frontendMainImage
    } = req.body;

    // Resim dosyalarını işle - önce multer'dan gelen dosyalar, sonra frontend'den gelen URL'ler
    let images = req.files ? req.files.map(file => `/uploads/listings/${file.filename}`) : [];
    
    // Frontend'den gelen images varsa ekle
    if (frontendImages) {
      const parsedImages = Array.isArray(frontendImages) ? frontendImages : JSON.parse(frontendImages);
      images = [...images, ...parsedImages];
    }
    
    // Main image belirleme - önce multer'dan gelen, sonra frontend'den gelen
    let main_image = images.length > 0 ? images[0] : null;
    if (frontendMainImage) {
      main_image = frontendMainImage;
    }

    const query = `
      INSERT INTO listings (
        user_id, product_id, brand_id, category_id, color_id, title, description, price, currency,
        location_city, location_district, location_address,
        contact_phone, contact_email, contact_whatsapp,
        is_urgent, images, main_image, category_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      req.user.id, product_id, brand_id, category_id, color_id, title, description, price, currency,
      location_city, location_district, location_address,
      contact_phone, contact_email, contact_whatsapp,
      is_urgent, JSON.stringify(images), main_image, typeof category_data === 'string' ? category_data : JSON.stringify(category_data)
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      success: true,
      message: 'İlan başarıyla oluşturuldu',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('İlan oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan oluşturulurken hata oluştu'
    });
  }
});

// İlan güncelle
router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      currency,
      location_city,
      location_district,
      location_address,
      contact_phone,
      contact_email,
      contact_whatsapp,
      is_urgent,
      category_data
    } = req.body;

    // İlanın sahibi olup olmadığını kontrol et
    const ownerCheck = await db.query(
      'SELECT user_id FROM listings WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    if (ownerCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    // Yeni resimler varsa işle
    let updateFields = [];
    let values = [];
    let paramIndex = 1;

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/listings/${file.filename}`);
      updateFields.push(`images = $${paramIndex}`);
      values.push(JSON.stringify(newImages));
      paramIndex++;
      
      updateFields.push(`main_image = $${paramIndex}`);
      values.push(newImages[0]);
      paramIndex++;
    }

    const fieldsToUpdate = {
      title, description, price, currency, location_city, location_district,
      location_address, contact_phone, contact_email, contact_whatsapp,
      is_urgent, category_data
    };

    Object.entries(fieldsToUpdate).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    const query = `
      UPDATE listings 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await db.query(query, values);

    res.json({
      success: true,
      message: 'İlan başarıyla güncellendi',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('İlan güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan güncellenirken hata oluştu'
    });
  }
});

// İlan sil
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın sahibi olup olmadığını kontrol et
    const ownerCheck = await db.query(
      'SELECT user_id, images FROM listings WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    if (ownerCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    // İlanı sil (soft delete)
    await db.query(
      'UPDATE listings SET is_active = false WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'İlan başarıyla silindi'
    });

  } catch (error) {
    console.error('İlan silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan silinirken hata oluştu'
    });
  }
});

// Kullanıcının ilanları
router.get('/user/my-listings', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        l.*,
        s.name as category_name
      FROM listings l
      JOIN sections s ON l.category_id = s.id
      WHERE l.user_id = $1
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [req.user.id, limit, offset]);

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM listings WHERE user_id = $1',
      [req.user.id]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Kullanıcı ilanları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlanlar getirilirken hata oluştu'
    });
  }
});

module.exports = router;