const db = require('../../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Admin yetki kontrolü
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin yetki kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yetki kontrolü yapılamadı'
    });
  }
};

// Araba marka logoları için multer yapılandırması
const brandStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/car-brands');
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

// Araba marka logoları için multer middleware
const brandUpload = multer({ 
  storage: brandStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  }
});

// Araba markası oluştur
const createCarBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const logoUrl = req.file ? `/uploads/car-brands/${req.file.filename}` : null;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Marka adı gereklidir'
      });
    }

    const result = await db.query(
      'INSERT INTO cars_brands (name, logo_url) VALUES ($1, $2) RETURNING *',
      [name, logoUrl]
    );

    res.status(201).json({
      success: true,
      message: 'Araba markası başarıyla oluşturuldu',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Araba markası oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba markası oluşturulamadı'
    });
  }
};

// Araba markasını güncelle
const updateCarBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const logoUrl = req.file ? `/uploads/car-brands/${req.file.filename}` : null;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Marka adı gereklidir'
      });
    }

    let query = 'UPDATE cars_brands SET name = $1';
    let params = [name];

    if (logoUrl) {
      query += ', logo_url = $2';
      params.push(logoUrl);
      query += ' WHERE id = $3 RETURNING *';
      params.push(id);
    } else {
      query += ' WHERE id = $2 RETURNING *';
      params.push(id);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba markası bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Araba markası başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Araba markası güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba markası güncellenemedi'
    });
  }
};

// Araba markasını sil
const deleteCarBrand = async (req, res) => {
  try {
    const { id } = req.params;

    // Önce bu markaya ait modellerin olup olmadığını kontrol et
    const modelsCheck = await db.query(
      'SELECT COUNT(*) as count FROM cars_products WHERE brand_id = $1',
      [id]
    );

    if (parseInt(modelsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu markaya ait modeller bulunduğu için silinemez. Önce modelleri silin.'
      });
    }

    const result = await db.query(
      'DELETE FROM cars_brands WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba markası bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Araba markası başarıyla silindi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Araba markası silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba markası silinemedi'
    });
  }
};

// Araba modelleri için multer yapılandırması
const modelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/car-models');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'model-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const modelUpload = multer({ 
  storage: modelStorage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
  }
}).any();

// Araba modeli oluştur
const createCarModel = async (req, res) => {
  try {
    const { 
      brand_id, 
      name, 
      colors, 
      engine_size, 
      model_year_start, 
      model_year_end, 
      description 
    } = req.body;

    if (!brand_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Marka ID ve model adı gereklidir'
      });
    }

    // Motor hacmi validasyonu
    if (engine_size && engine_size.trim()) {
      const engineSizes = engine_size.split(',').map(size => size.trim()).filter(size => size.length > 0);
      // Sınırlama kaldırıldı - kullanıcı istediği kadar motor hacmi girebilir
    }

    // Convert empty strings to null for integer fields
    const processedModelYearStart = model_year_start === '' || model_year_start === undefined ? null : parseInt(model_year_start);
    const processedModelYearEnd = model_year_end === '' || model_year_end === undefined ? null : parseInt(model_year_end);

    // Ana resim URL'sini al
    const imageUrl = req.files && req.files['image'] ? 
      `/uploads/car-models/${req.files['image'][0].filename}` : null;

    // Renk resimlerini işle
    let colorImages = [];
    if (colors) {
      const parsedColors = JSON.parse(colors);
      colorImages = parsedColors.map((color, index) => {
        // Dinamik olarak color_image_${index} alanını ara
        const colorImageFile = req.files && req.files.find(file => file.fieldname === `color_image_${index}`);
        
        return {
          name: color.name,
          hex: color.hex,
          image_url: colorImageFile ? `/uploads/car-models/${colorImageFile.filename}` : null
        };
      });
    }

    const result = await db.query(
      'INSERT INTO cars_products (brand_id, name, image_url, colors, engine_size, model_year_start, model_year_end, description, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [brand_id, name, imageUrl, JSON.stringify(colorImages), engine_size, processedModelYearStart, processedModelYearEnd, description, true]
    );

    res.status(201).json({
      success: true,
      message: 'Araba modeli başarıyla oluşturuldu',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Araba modeli oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba modeli oluşturulamadı',
      error: error.message
    });
  }
};

// Araba modelini güncelle
const updateCarModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      brand_id, 
      name, 
      colors, 
      engine_size, 
      model_year_start, 
      model_year_end, 
      description 
    } = req.body;

    if (!brand_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Marka ID ve model adı gereklidir'
      });
    }

    // Motor hacmi validasyonu
    if (engine_size && engine_size.trim()) {
      const engineSizes = engine_size.split(',').map(size => size.trim()).filter(size => size.length > 0);
      // Sınırlama kaldırıldı - kullanıcı istediği kadar motor hacmi girebilir
      
      // Her motor hacmi için uzunluk kontrolü - sınır kaldırıldı
      // for (const size of engineSizes) {
      //   if (size.length > 20) {
      //     return res.status(400).json({
      //       success: false,
      //       message: 'Motor hacmi çok uzun (maksimum 20 karakter)'
      //     });
      //   }
      // }
    }

    // Convert empty strings to null for integer fields
    const processedModelYearStart = model_year_start === '' || model_year_start === undefined ? null : parseInt(model_year_start);
    const processedModelYearEnd = model_year_end === '' || model_year_end === undefined ? null : parseInt(model_year_end);

    // Mevcut modeli al
    const existingModel = await db.query('SELECT * FROM cars_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba modeli bulunamadı'
      });
    }

    // Ana resim URL'sini al (yeni yüklendiyse)
    const imageUrl = req.files && req.files.find(file => file.fieldname === 'image') ? 
      `/uploads/car-models/${req.files.find(file => file.fieldname === 'image').filename}` : 
      existingModel.rows[0].image_url;

    // Renk resimlerini işle
    let colorImages = [];
    if (colors) {
      const parsedColors = JSON.parse(colors);
      colorImages = parsedColors.map((color, index) => {
        // Dinamik olarak color_image_${index} alanını ara
        const colorImageFile = req.files && req.files.find(file => file.fieldname === `color_image_${index}`);
        
        return {
          name: color.name,
          hex: color.hex,
          image_url: colorImageFile ? `/uploads/car-models/${colorImageFile.filename}` : color.image_url
        };
      });
    }

    const result = await db.query(
      'UPDATE cars_products SET brand_id = $1, name = $2, image_url = $3, colors = $4, engine_size = $5, model_year_start = $6, model_year_end = $7, description = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
      [brand_id, name, imageUrl, JSON.stringify(colorImages), engine_size, processedModelYearStart, processedModelYearEnd, description, id]
    );

    res.json({
      success: true,
      message: 'Araba modeli başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Araba modeli güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba modeli güncellenemedi',
      error: error.message
    });
  }
};

// Araba modelini sil
const deleteCarModel = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM cars_products WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba modeli bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Araba modeli başarıyla silindi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Araba modeli silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba modeli silinemedi'
    });
  }
};

// Araba modeli durumunu değiştir (aktif/pasif)
const toggleCarModelStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE cars_products SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba modeli bulunamadı'
      });
    }

    res.json({
      success: true,
      message: `Araba modeli ${result.rows[0].is_active ? 'aktif' : 'pasif'} duruma getirildi`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Araba modeli durumu değiştirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba modeli durumu değiştirilemedi'
    });
  }
};

// Admin için tüm araba ilanlarını getir
const getAllCarListingsForAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      status,
      brand,
      search
    } = req.query;
    
    // Sayfalama hesaplamaları
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        cl.*,
        cl.deleted_at as deleted_at,
        CASE 
          WHEN cl.deleted_at IS NOT NULL THEN 'deleted'
          ELSE cl.status
        END as display_status,
        u.name as user_name,
        u.surname as user_surname,
        u.email as user_email,
        u.phone as user_phone,
        u.profile_image_url as user_profile_image
      FROM cars_listings cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Durum filtresi
    if (status) {
      query += ` AND cl.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }
    
    // Marka filtresi
    if (brand) {
      query += ` AND LOWER(cl.brand_name) LIKE LOWER($${queryParams.length + 1})`;
      queryParams.push(`%${brand}%`);
    }
    
    // Arama filtresi
    if (search) {
      query += ` AND (LOWER(cl.title) LIKE LOWER($${queryParams.length + 1}) OR LOWER(cl.description) LIKE LOWER($${queryParams.length + 1}))`;
      queryParams.push(`%${search}%`);
      queryParams.push(`%${search}%`);
    }
    
    // Sıralama ve sayfalama
    query += ` ORDER BY cl.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit));
    queryParams.push(offset);
    
    const result = await db.query(query, queryParams);
    
    // Toplam sayıyı al
    let countQuery = `
      SELECT COUNT(*) as count
      FROM cars_listings cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (status) {
      countQuery += ` AND cl.status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    
    if (brand) {
      countQuery += ` AND LOWER(cl.brand_name) LIKE LOWER($${countParams.length + 1})`;
      countParams.push(`%${brand}%`);
    }
    
    if (search) {
      countQuery += ` AND (LOWER(cl.title) LIKE LOWER($${countParams.length + 1}) OR LOWER(cl.description) LIKE LOWER($${countParams.length + 1}))`;
      countParams.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        listings: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin araba ilanları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba ilanları getirilemedi'
    });
  }
};

// Araba ilanını onayla
const approveCarListing = async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın mevcut bilgilerini al
    const existingListing = await db.query(
      'SELECT user_id, title, duration_days FROM cars_listings WHERE id = $1',
      [id]
    );

    if (existingListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const { user_id, title, duration_days } = existingListing.rows[0];
    const durationDays = duration_days || 7;

    // İlanı onayla ve expires_at'i hesapla
    const result = await db.query(`
      UPDATE cars_listings 
      SET status = 'approved', 
          expires_at = NOW() + INTERVAL '1 day' * $2,
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING *
    `, [id, durationDays]);

    // Bildirim gönder
    try {
      console.log('📱 Bildirim gönderiliyor:', { user_id, title });
      const notificationService = require('../../services/notificationService');
      const notifResult = await notificationService.sendToUser(
        user_id,
        {
          title: '✅ İlanınız Onaylandı!',
          body: `"${title}" ilanınız onaylandı ve yayına alındı.`,
        },
        {
          type: 'listing_approved',
          listingId: id.toString(),
          category: 'car',
        }
      );
      console.log('✅ Bildirim gönderildi:', notifResult);
    } catch (notifError) {
      console.error('❌ Bildirim gönderilemedi:', notifError);
    }

    res.json({
      success: true,
      message: `İlan başarıyla onaylandı ve ${durationDays} günlük süre başlatıldı`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('İlan onaylanırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan onaylanamadı',
      error: error.message
    });
  }
};

// Araba ilanını reddet
const rejectCarListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason || rejection_reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reddetme sebebi gereklidir'
      });
    }

    // İlanın mevcut olup olmadığını kontrol et
    const existingListing = await db.query('SELECT user_id, title FROM cars_listings WHERE id = $1', [id]);
    if (existingListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const { user_id, title } = existingListing.rows[0];

    // İlanı reddet
    await db.query(`
      UPDATE cars_listings 
      SET status = 'rejected', 
          rejection_reason = $1,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [rejection_reason.trim(), id]);

    // Bildirim gönder
    try {
      console.log('📱 Bildirim gönderiliyor (red):', { user_id, title });
      const notificationService = require('../../services/notificationService');
      await notificationService.sendToUser(
        user_id,
        {
          title: '❌ İlanınız Reddedildi',
          body: `"${title}" ilanınız reddedildi. Sebep: ${rejection_reason.trim()}`,
        },
        {
          type: 'listing_rejected',
          listingId: id.toString(),
          category: 'car',
        }
      );
      console.log('✅ Red bildirimi gönderildi');
    } catch (notifError) {
      console.error('❌ Bildirim gönderilemedi:', notifError);
    }

    res.json({
      success: true,
      message: 'İlan başarıyla reddedildi',
      data: {
        id: id,
        status: 'rejected',
        rejection_reason: rejection_reason.trim()
      }
    });
  } catch (error) {
    console.error('İlan reddedilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan reddedilemedi',
      error: error.message
    });
  }
};

// Araba ilanını beklemede durumuna çevir
const revertCarListingToPending = async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın mevcut olup olmadığını kontrol et
    const existingListing = await db.query('SELECT * FROM cars_listings WHERE id = $1', [id]);
    if (existingListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    // İlanı beklemede durumuna çevir
    await db.query(`
      UPDATE cars_listings 
      SET status = 'pending', 
          rejection_reason = NULL,
          expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'İlan durumu beklemede olarak değiştirildi',
      data: {
        id: id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('İlan durumu değiştirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan durumu değiştirilemedi',
      error: error.message
    });
  }
};

// Araba ilanını sil (Admin)
const deleteCarListingByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın mevcut olup olmadığını kontrol et
    const existingListing = await db.query('SELECT * FROM cars_listings WHERE id = $1', [id]);
    if (existingListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    // İlanı sil
    await db.query('DELETE FROM cars_listings WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'İlan başarıyla silindi'
    });
  } catch (error) {
    console.error('İlan silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan silinemedi',
      error: error.message
    });
  }
};

// Admin için araba ilanı süre uzatma fonksiyonu
const extendCarListingDuration = async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın var olup olmadığını ve durumunu kontrol et
    const checkResult = await db.query(
      'SELECT id, title, status, expires_at FROM cars_listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const listing = checkResult.rows[0];

    // Sadece süresi dolmuş ilanların süresini uzatabilir
    if (listing.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Sadece süresi dolmuş ilanların süresi uzatılabilir'
      });
    }

    // İlanın süresini 7 gün uzat ve durumunu approved yap
    const result = await db.query(
      'UPDATE cars_listings SET expires_at = NOW() + INTERVAL \'7 days\', status = \'approved\', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({
      success: true,
      message: 'Araba ilanının süresi başarıyla uzatıldı',
      data: {
        id: result.rows[0].id,
        title: result.rows[0].title,
        status: result.rows[0].status,
        expires_at: result.rows[0].expires_at,
        newExpiryDate: result.rows[0].expires_at
      }
    });

  } catch (error) {
    console.error('Araba ilanı süresi uzatılırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba ilanı süresi uzatılamadı',
      error: error.message
    });
  }
};

// Araba marka sıralarını güncelle
const updateCarBrandOrder = async (req, res) => {
  try {
    let { orders } = req.body; // Beklenen: [{ id: 1, order_index: 2 }, ...]

    // Eğer tüm body bir dizi ise fallback olarak kullan
    if (!orders && Array.isArray(req.body)) {
      orders = req.body;
    }

    // İstek gövdesi farklı formatta geldiyse güvenli parse dene
    if (typeof orders === 'string') {
      try {
        orders = JSON.parse(orders);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Sıra verisi JSON formatında olmalı'
        });
      }
    }

    // Temel doğrulamalar (esnetilmiş)
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sıra verisi: orders bir dizi olmalı'
      });
    }

    // Eleman bazlı normalizasyon (esnek alan isimleri ve değer dönüştürme)
    const normalized = orders.map((item, idx) => {
      const rawId = item.id ?? item.brand_id ?? item.brandId;
      const rawOrder = item.order_index ?? item.order ?? item.position ?? (idx + 1);

      const id = Number.parseInt(String(rawId), 10);
      let orderIndex = Number.parseInt(String(rawOrder), 10);
      if (!Number.isFinite(orderIndex) || orderIndex < 1) orderIndex = idx + 1;

      return { id, order_index: orderIndex };
    }).filter(x => Number.isInteger(x.id) && x.id > 0);

    if (normalized.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli öğe bulunamadı: id ve order_index gerekli'
      });
    }

    // Transaction başlat
    await db.query('BEGIN');

    try {
      for (const order of normalized) {
        const query = 'UPDATE cars_brands SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
        await db.query(query, [order.order_index, order.id]);
      }

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Araba marka sıraları başarıyla güncellendi'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Araba marka sıraları güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba marka sıraları güncellenirken hata oluştu'
    });
  }
};

// Araba model sıralarını güncelle
const updateCarModelOrder = async (req, res) => {
  try {
    let { orders } = req.body; // Beklenen: [{ id: 1, order_index: 2 }, ...]

    // Eğer tüm body bir dizi ise fallback olarak kullan
    if (!orders && Array.isArray(req.body)) {
      orders = req.body;
    }

    // İstek gövdesi farklı formatta geldiyse güvenli parse dene
    if (typeof orders === 'string') {
      try {
        orders = JSON.parse(orders);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Sıra verisi JSON formatında olmalı'
        });
      }
    }

    // Temel doğrulamalar (esnetilmiş)
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sıra verisi: orders bir dizi olmalı'
      });
    }

    // Eleman bazlı normalizasyon (esnek alan isimleri ve değer dönüştürme)
    const normalized = orders.map((item, idx) => {
      const rawId = item.id ?? item.model_id ?? item.product_id ?? item.productId ?? item.modelId;
      const rawOrder = item.order_index ?? item.order ?? item.position ?? (idx + 1);

      const id = Number.parseInt(String(rawId), 10);
      let orderIndex = Number.parseInt(String(rawOrder), 10);
      if (!Number.isFinite(orderIndex) || orderIndex < 1) orderIndex = idx + 1;

      return { id, order_index: orderIndex };
    }).filter(x => Number.isInteger(x.id) && x.id > 0);

    if (normalized.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli öğe bulunamadı: id ve order_index gerekli'
      });
    }

    // Transaction başlat
    await db.query('BEGIN');

    try {
      for (const order of normalized) {
        const query = 'UPDATE cars_products SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
        await db.query(query, [order.order_index, order.id]);
      }

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Araba model sıraları başarıyla güncellendi'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Araba model sıraları güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba model sıraları güncellenirken hata oluştu'
    });
  }
};

module.exports = {
  requireAdmin,
  brandUpload,
  modelUpload,
  createCarBrand,
  updateCarBrand,
  deleteCarBrand,
  createCarModel,
  updateCarModel,
  deleteCarModel,
  toggleCarModelStatus,
  getAllCarListingsForAdmin,
  approveCarListing,
  rejectCarListing,
  revertCarListingToPending,
  deleteCarListingByAdmin,
  extendCarListingDuration,
  updateCarBrandOrder,
  updateCarModelOrder
};
