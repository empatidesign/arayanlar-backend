const db = require('../../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Admin yetki kontrolü
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Giriş yapmanız gerekli'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    next();
  } catch (error) {
    console.error('Admin yetki kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yetki kontrolü sırasında hata oluştu'
    });
  }
};

// Development ortamı için admin kontrolü (daha esnek)
const requireAdminDev = async (req, res, next) => {
  next(); // Development'ta admin kontrolü yapmıyoruz
};

// Saat modeli için multer storage
const watchModelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    
    // Color images için ayrı klasör
    if (file.fieldname.startsWith('color_image_')) {
      uploadPath = path.join(__dirname, '..', '..', 'uploads', 'watch-models', 'colors');
    } else {
      uploadPath = path.join(__dirname, '..', '..', 'uploads', 'watch-models');
    }
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    if (file.fieldname.startsWith('color_image_')) {
      cb(null, 'color-' + uniqueSuffix + path.extname(file.originalname));
    } else {
      cb(null, 'model-' + uniqueSuffix + path.extname(file.originalname));
    }
  }
});

const watchModelUpload = multer({ 
  storage: watchModelStorage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  }
}).any();

// Admin için tüm saat modellerini getir
const getAllWatchModels = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { brand_id, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        wp.*,
        wp.order_index,
        wb.name as brand_name
      FROM watch_products wp
      LEFT JOIN watch_brands wb ON wp.brand_id = wb.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (brand_id) {
      query += ` AND wp.brand_id = $${queryParams.length + 1}`;
      queryParams.push(brand_id);
    }
    
    // Search parametresi - sadece text alanlarda arama yap
    if (search && search.trim()) {
      query += ` AND (
        LOWER(wp.name) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(wb.name) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(COALESCE(wp.model, '')) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(COALESCE(wp.description, '')) LIKE LOWER($${queryParams.length + 1})
      )`;
      queryParams.push(`%${search.trim()}%`);
    }
    
    query += ` ORDER BY wp.order_index ASC NULLS LAST, wb.name ASC, wp.name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit));
    queryParams.push(offset);

    const result = await db.query(query, queryParams);

    // Toplam sayıyı al
    let countQuery = `SELECT COUNT(*) as total FROM watch_products wp LEFT JOIN watch_brands wb ON wp.brand_id = wb.id WHERE 1=1`;
    const countParams = [];
    
    if (brand_id) {
      countQuery += ` AND wp.brand_id = $${countParams.length + 1}`;
      countParams.push(brand_id);
    }
    
    if (search && search.trim()) {
      countQuery += ` AND (
        LOWER(wp.name) LIKE LOWER($${countParams.length + 1}) OR
        LOWER(wb.name) LIKE LOWER($${countParams.length + 1}) OR
        LOWER(COALESCE(wp.model, '')) LIKE LOWER($${countParams.length + 1}) OR
        LOWER(COALESCE(wp.description, '')) LIKE LOWER($${countParams.length + 1})
      )`;
      countParams.push(`%${search.trim()}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      models: result.rows || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Saat modelleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat modelleri getirilemedi',
      models: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    });
  }
};

// Admin için saat modeli oluştur
const createWatchModel = async (req, res) => {
  try {
    // Admin kontrolü
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    console.log('🔧 [CreateModel] Request body:', req.body);
    console.log('🔧 [CreateModel] Request files:', req.files);

    const { name, brand_id, colors, model, specifications, description } = req.body;
    
    if (!name || !brand_id) {
      console.log('❌ [CreateModel] Eksik alanlar - name:', name, 'brand_id:', brand_id);
      return res.status(400).json({
        success: false,
        message: 'Model adı ve marka ID gerekli'
      });
    }

    // Aynı isimde model var mı kontrol et
    const existingModel = await db.query('SELECT id FROM watch_products WHERE LOWER(name) = LOWER($1) AND brand_id = $2', [name, brand_id]);
    if (existingModel.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu isimde bir model zaten mevcut'
      });
    }

    // Ana resim işle
    let image_url = null;
    if (req.files && req.files.length > 0) {
      const imageFile = req.files.find(file => file.fieldname === 'image');
      if (imageFile) {
        image_url = `/uploads/watch-models/${imageFile.filename}`;
      }
    }

    // Renk resimlerini işle
    let colorImages = [];
    if (colors) {
      try {
        console.log('🎨 [CreateModel] Colors raw:', colors);
        const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
        console.log('🎨 [CreateModel] Colors parsed:', parsedColors);
        
        if (Array.isArray(parsedColors)) {
          colorImages = parsedColors.map((color, index) => {
            let colorImageUrl = null;
            
            console.log(`🎨 [CreateModel] Processing color ${index}:`, color);
            
            // Eğer color.image bir key ise (örn: "color_image_0"), dosyayı bul
            if (color.image && typeof color.image === 'string' && color.image.startsWith('color_image_')) {
              console.log(`🎨 [CreateModel] Looking for uploaded file with key: ${color.image}`);
              
              if (req.files && req.files.length > 0) {
                const colorImageFile = req.files.find(file => file.fieldname === color.image);
                if (colorImageFile) {
                  colorImageUrl = `/uploads/watch-models/colors/${colorImageFile.filename}`;
                  console.log(`✅ [CreateModel] Color image uploaded: ${colorImageUrl}`);
                } else {
                  console.log(`⚠️ [CreateModel] No file found for key: ${color.image}`);
                }
              }
            }
            // Eğer color.image zaten bir yol ise (örn: "/uploads/..."), onu koru
            else if (color.image && typeof color.image === 'string' && color.image.startsWith('/uploads/')) {
              colorImageUrl = color.image;
              console.log(`🎨 [CreateModel] Using existing image path: ${colorImageUrl}`);
            }
            
            const processedColor = {
              name: color.name,
              hex: color.hex,
              gender: color.gender || 'unisex',
              image: colorImageUrl
            };
            
            console.log(`🎨 [CreateModel] Processed color ${index}:`, processedColor);
            return processedColor;
          });
        }
        
        console.log('🎨 [CreateModel] Final colorImages:', colorImages);
      } catch (error) {
        console.error('❌ [CreateModel] Renk verisi parse hatası:', error);
        return res.status(400).json({
          success: false,
          message: 'Renk verisi işlenirken hata oluştu: ' + error.message
        });
      }
    }

    const result = await db.query(`
      INSERT INTO watch_products (name, brand_id, image, colors, category_id, model, specifications, description, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 7, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [
      name, 
      brand_id, 
      image_url, 
      JSON.stringify(colorImages), 
      model || null, 
      specifications || null, 
      description || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Saat modeli başarıyla oluşturuldu',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Saat modeli oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat modeli oluşturulamadı',
      error: error.message
    });
  }
};

// Admin için saat modeli güncelle
const updateWatchModel = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;
    const { name, brand_id, colors } = req.body;

    // Mevcut modeli kontrol et
    const existingModel = await db.query('SELECT * FROM watch_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat modeli bulunamadı'
      });
    }

    // Aynı isimde başka model var mı kontrol et (kendisi hariç)
    if (name) {
      const duplicateModel = await db.query('SELECT id FROM watch_products WHERE LOWER(name) = LOWER($1) AND brand_id = $2 AND id != $3', [name, brand_id || existingModel.rows[0].brand_id, id]);
      if (duplicateModel.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu isimde başka bir model zaten mevcut'
        });
      }
    }

    let image_url = existingModel.rows[0].image;
    const imageFile = req.files.find(file => file.fieldname === 'image');
    if (imageFile) {
      image_url = `/uploads/watch-models/${imageFile.filename}`;
      
      // Eski resmi sil
      if (existingModel.rows[0].image) {
        const oldImagePath = path.join(__dirname, '..', existingModel.rows[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    // Renk resimlerini işle
    let colorImages = existingModel.rows[0].colors || [];
    if (colors) {
      try {
        console.log('🎨 [UpdateModel] Colors raw:', colors);
        const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
        console.log('🎨 [UpdateModel] Colors parsed:', parsedColors);
        
        if (Array.isArray(parsedColors)) {
          colorImages = parsedColors.map((color, index) => {
            let colorImageUrl = null;
            
            console.log(`🎨 [UpdateModel] Processing color ${index}:`, color);
            
            // Eğer color.image bir key ise (örn: "color_image_0"), dosyayı bul
            if (color.image && typeof color.image === 'string' && color.image.startsWith('color_image_')) {
              console.log(`🎨 [UpdateModel] Looking for uploaded file with key: ${color.image}`);
              
              if (req.files && req.files.length > 0) {
                const colorImageFile = req.files.find(file => file.fieldname === color.image);
                if (colorImageFile) {
                  colorImageUrl = `/uploads/watch-models/colors/${colorImageFile.filename}`;
                  console.log(`✅ [UpdateModel] Color image uploaded: ${colorImageUrl}`);
                } else {
                  console.log(`⚠️ [UpdateModel] No file found for key: ${color.image}`);
                }
              }
            }
            // Eğer color.image zaten bir yol ise (örn: "/uploads/..."), onu koru
            else if (color.image && typeof color.image === 'string' && color.image.startsWith('/uploads/')) {
              colorImageUrl = color.image;
              console.log(`🎨 [UpdateModel] Using existing image path: ${colorImageUrl}`);
            }
            
            return {
              name: color.name,
              hex: color.hex,
              gender: color.gender || 'unisex',
              image: colorImageUrl
            };
          });
        }
        
        console.log('🎨 [UpdateModel] Final colorImages:', colorImages);
      } catch (error) {
        console.error('❌ [UpdateModel] Renk verisi parse hatası:', error);
      }
    }

    const result = await db.query(`
      UPDATE watch_products 
      SET name = COALESCE($1, name), 
          brand_id = COALESCE($2, brand_id),
          image = $3, 
          colors = $4,
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, brand_id, image_url, JSON.stringify(colorImages), id]);

    res.json({
      success: true,
      message: 'Saat modeli başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Saat modeli güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat modeli güncellenemedi',
      error: error.message
    });
  }
};

// Admin için saat modeli sil
const deleteWatchModel = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;

    // Mevcut modeli kontrol et
    const existingModel = await db.query('SELECT * FROM watch_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat modeli bulunamadı'
      });
    }

    // Resim dosyalarını sil
    if (existingModel.rows[0].image) {
      const imagePath = path.join(__dirname, '..', existingModel.rows[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Renk resimlerini sil
    if (existingModel.rows[0].colors) {
      try {
        const colors = JSON.parse(existingModel.rows[0].colors);
        if (Array.isArray(colors)) {
          colors.forEach(color => {
            if (color.image) {
              const colorImagePath = path.join(__dirname, '..', color.image);
              if (fs.existsSync(colorImagePath)) {
                fs.unlinkSync(colorImagePath);
              }
            }
          });
        }
      } catch (error) {
        console.error('Renk resimleri silinirken hata:', error);
      }
    }

    await db.query('DELETE FROM watch_products WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Saat modeli başarıyla silindi'
    });
  } catch (error) {
    console.error('Saat modeli silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat modeli silinemedi',
      error: error.message
    });
  }
};

// Admin için saat modeli durumunu değiştir
const toggleWatchModelStatus = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;

    // Mevcut durumu al
    const currentModel = await db.query('SELECT is_active FROM watch_products WHERE id = $1', [id]);
    if (currentModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat modeli bulunamadı'
      });
    }

    const newStatus = !currentModel.rows[0].is_active;

    const result = await db.query(`
      UPDATE watch_products 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [newStatus, id]);

    res.json({
      success: true,
      message: `Saat modeli ${newStatus ? 'aktif' : 'pasif'} hale getirildi`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Saat modeli durumu değiştirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat modeli durumu değiştirilemedi'
    });
  }
};

// Saat markası için multer storage
const watchBrandStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'watch-brands');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const watchBrandUpload = multer({ 
  storage: watchBrandStorage,
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

// Admin için saat markalarını listele
const getWatchBrandsForAdmin = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const result = await db.query(`
      SELECT DISTINCT id, name, category_id, image, country, description, is_active, order_index, created_at, updated_at
      FROM watch_brands 
      ORDER BY order_index ASC NULLS LAST, name ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Saat markaları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat markaları getirilemedi'
    });
  }
};

// Admin için saat markası oluştur
const createWatchBrand = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Marka adı gerekli'
      });
    }

    // Aynı isimde marka var mı kontrol et
    const existingBrand = await db.query('SELECT id FROM watch_brands WHERE LOWER(name) = LOWER($1)', [name]);
    if (existingBrand.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu isimde bir marka zaten mevcut'
      });
    }

    let logo_url = null;
    if (req.file) {
      logo_url = `/uploads/watch-brands/${req.file.filename}`;
    }

    const result = await db.query(`
      INSERT INTO watch_brands (name, image, category_id, created_at, updated_at)
      VALUES ($1, $2, 7, NOW(), NOW())
      RETURNING *
    `, [name, logo_url]);

    res.status(201).json({
      success: true,
      message: 'Saat markası başarıyla oluşturuldu',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Saat markası oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat markası oluşturulamadı',
      error: error.message
    });
  }
};

// Admin için saat markası güncelle
const updateWatchBrand = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;
    const { name, country, description } = req.body;

    // Mevcut markayı kontrol et
    const existingBrand = await db.query('SELECT * FROM watch_brands WHERE id = $1', [id]);
    if (existingBrand.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat markası bulunamadı'
      });
    }

    // Aynı isimde başka marka var mı kontrol et (kendisi hariç)
    if (name) {
      const duplicateBrand = await db.query('SELECT id FROM watch_brands WHERE LOWER(name) = LOWER($1) AND id != $2', [name, id]);
      if (duplicateBrand.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu isimde başka bir marka zaten mevcut'
        });
      }
    }

    let logo_url = existingBrand.rows[0].image;
    if (req.file) {
      logo_url = `/uploads/watch-brands/${req.file.filename}`;
      
      // Eski logoyu sil
      if (existingBrand.rows[0].image) {
        const oldLogoPath = path.join(__dirname, '..', existingBrand.rows[0].image);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }
    }

    const result = await db.query(`
      UPDATE watch_brands 
      SET name = COALESCE($1, name), 
          image = $2, 
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [name, logo_url, id]);

    res.json({
      success: true,
      message: 'Saat markası başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Saat markası güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat markası güncellenemedi',
      error: error.message
    });
  }
};

// Admin için saat markası sil
const deleteWatchBrand = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;
    console.log('deleteWatchBrand called with id:', id);

    // Mevcut markayı kontrol et
    const existingBrand = await db.query('SELECT * FROM watch_brands WHERE id = $1', [id]);
    console.log('existingBrand query result:', existingBrand.rows);
    
    if (existingBrand.rows.length === 0) {
      console.log('Brand not found, returning 404');
      return res.status(404).json({
        success: false,
        message: 'Saat markası bulunamadı'
      });
    }

    // Markaya ait modeller var mı kontrol et
    console.log('Checking models for brand_id:', id);
    const modelsCount = await db.query('SELECT COUNT(*) FROM watch_products WHERE brand_id = $1', [id]);
    console.log('modelsCount query result:', modelsCount.rows);
    
    if (parseInt(modelsCount.rows[0].count) > 0) {
      console.log('Brand has models, cannot delete. Count:', modelsCount.rows[0].count);
      return res.status(400).json({
        success: false,
        message: 'Bu markaya ait modeller bulunduğu için silinemez'
      });
    }

    // Logo dosyasını sil
    if (existingBrand.rows[0].image) {
      const logoPath = path.join(__dirname, '..', existingBrand.rows[0].image);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    await db.query('DELETE FROM watch_brands WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Saat markası başarıyla silindi'
    });
  } catch (error) {
    console.error('Saat markası silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat markası silinemedi',
      error: error.message
    });
  }
};

// Admin için tüm saat ilanlarını getir
const getAllWatchListingsForAdmin = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { 
      page = 1, 
      limit = 20,
      status,
      brand,
      model,
      city,
      title,
      search
    } = req.query;
    
    // Sayfalama hesaplamaları
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        wl.*,
        wl.title as title,
        wl.main_image as main_image,
        wl.price as price,
        wl.location_city as location_city,
        wl.description as description,
        wl.images as images,
        wl.deleted_at as deleted_at,
        CASE 
          WHEN wl.deleted_at IS NOT NULL THEN 'deleted'
          ELSE wl.status
        END as display_status,
        u.name as user_name,
        u.surname as user_surname,
        u.email as user_email,
        u.phone as user_phone,
        wb.name as brand_name,
        wp.name as product_name
      FROM watch_listings wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      LEFT JOIN watch_products wp ON wl.product_id = wp.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Durum filtresi
    if (status) {
      query += ` AND wl.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }
    
    // Marka filtresi (ID veya isim)
    if (brand) {
      // Eğer sayı ise ID olarak, değilse isim olarak ara
      if (!isNaN(brand)) {
        query += ` AND wl.brand_id = $${queryParams.length + 1}`;
        queryParams.push(parseInt(brand));
      } else {
        query += ` AND LOWER(wb.name) LIKE LOWER($${queryParams.length + 1})`;
        queryParams.push(`%${brand}%`);
      }
    }
    
    // Model filtresi (ID veya isim)
    if (model) {
      // Eğer sayı ise ID olarak, değilse isim olarak ara
      if (!isNaN(model)) {
        query += ` AND wl.product_id = $${queryParams.length + 1}`;
        queryParams.push(parseInt(model));
      } else {
        query += ` AND LOWER(wp.name) LIKE LOWER($${queryParams.length + 1})`;
        queryParams.push(`%${model}%`);
      }
    }
    
    // Şehir filtresi
    if (city) {
      query += ` AND LOWER(wl.location_city) LIKE LOWER($${queryParams.length + 1})`;
      queryParams.push(`%${city}%`);
    }
    
    // Başlık filtresi
    if (title) {
      query += ` AND LOWER(wl.title) LIKE LOWER($${queryParams.length + 1})`;
      queryParams.push(`%${title}%`);
    }
    
    // Genel arama filtresi (başlık, açıklama, marka, model)
    if (search) {
      query += ` AND (
        LOWER(wl.title) LIKE LOWER($${queryParams.length + 1}) OR 
        LOWER(wl.description) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(wb.name) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(wp.name) LIKE LOWER($${queryParams.length + 1})
      )`;
      queryParams.push(`%${search}%`);
    }
    
    // Sıralama ve sayfalama
    query += ` ORDER BY wl.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit));
    queryParams.push(offset);
    
    const result = await db.query(query, queryParams);
    
    // Resim URL'lerini düzenle
    const processedListings = result.rows.map(listing => {
      // Ana resim URL'ini düzenle
      let mainImageUrl = null;
      if (listing.main_image) {
        // Eğer tam URL ise (http ile başlıyorsa), localhost'a çevir
        if (listing.main_image.startsWith('http://') || listing.main_image.startsWith('https://')) {
          // IP adresini localhost ile değiştir
          mainImageUrl = listing.main_image.replace(/http:\/\/192\.168\.\d+\.\d+:3000/, 'http://localhost:3000');
        } else {
          // uploads/watches/ prefix'ini kaldır ve /uploads/listings/ ile değiştir
          if (listing.main_image.startsWith('uploads/watches/')) {
            mainImageUrl = listing.main_image.replace('uploads/watches/', '/uploads/listings/');
          } else {
            mainImageUrl = listing.main_image.startsWith('/uploads/') 
              ? listing.main_image 
              : `/uploads/listings/${listing.main_image}`;
          }
        }
      }
      
      // Diğer resimleri düzenle
      let imagesArray = [];
      if (listing.images) {
        try {
          const parsedImages = typeof listing.images === 'string' 
            ? JSON.parse(listing.images) 
            : listing.images;
          
          if (Array.isArray(parsedImages)) {
            imagesArray = parsedImages.map(img => {
              // Eğer tam URL ise (http ile başlıyorsa), localhost'a çevir
              if (img.startsWith('http://') || img.startsWith('https://')) {
                // IP adresini localhost ile değiştir
                return img.replace(/http:\/\/192\.168\.\d+\.\d+:3000/, 'http://localhost:3000');
              } else {
                // uploads/watches/ prefix'ini kaldır ve /uploads/listings/ ile değiştir
                if (img.startsWith('uploads/watches/')) {
                  return img.replace('uploads/watches/', '/uploads/listings/');
                }
                return img.startsWith('/uploads/') ? img : `/uploads/listings/${img}`;
              }
            });
          }
        } catch (error) {
          console.error('Resim array parse hatası:', error);
          imagesArray = [];
        }
      }
      
      return {
        ...listing,
        main_image: mainImageUrl,
        images: imagesArray
      };
    });
    
    // Toplam sayıyı al
    let countQuery = `
      SELECT COUNT(*) as total
      FROM watch_listings wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      LEFT JOIN watch_products wp ON wl.product_id = wp.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (status) {
      countQuery += ` AND wl.status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    
    // Marka filtresi (ID veya isim)
    if (brand) {
      if (!isNaN(brand)) {
        countQuery += ` AND wl.brand_id = $${countParams.length + 1}`;
        countParams.push(parseInt(brand));
      } else {
        countQuery += ` AND LOWER(wb.name) LIKE LOWER($${countParams.length + 1})`;
        countParams.push(`%${brand}%`);
      }
    }
    
    // Model filtresi (ID veya isim)
    if (model) {
      if (!isNaN(model)) {
        countQuery += ` AND wl.product_id = $${countParams.length + 1}`;
        countParams.push(parseInt(model));
      } else {
        countQuery += ` AND LOWER(wp.name) LIKE LOWER($${countParams.length + 1})`;
        countParams.push(`%${model}%`);
      }
    }
    
    // Şehir filtresi
    if (city) {
      countQuery += ` AND LOWER(wl.location_city) LIKE LOWER($${countParams.length + 1})`;
      countParams.push(`%${city}%`);
    }
    
    // Başlık filtresi
    if (title) {
      countQuery += ` AND LOWER(wl.title) LIKE LOWER($${countParams.length + 1})`;
      countParams.push(`%${title}%`);
    }
    
    // Genel arama filtresi
    if (search) {
      countQuery += ` AND (
        LOWER(wl.title) LIKE LOWER($${countParams.length + 1}) OR 
        LOWER(wl.description) LIKE LOWER($${countParams.length + 1}) OR
        LOWER(wb.name) LIKE LOWER($${countParams.length + 1}) OR
        LOWER(wp.name) LIKE LOWER($${countParams.length + 1})
      )`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        listings: processedListings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Saat ilanları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat ilanları getirilemedi'
    });
  }
};

// Admin için bekleyen saat ilanlarını getir
const getPendingWatchListings = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { 
      page = 1, 
      limit = 20,
      search
    } = req.query;
    
    // Sayfalama hesaplamaları
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        wl.*,
        wl.title as title,
        wl.main_image as main_image,
        wl.price as price,
        wl.location_city as location_city,
        wl.description as description,
        wl.images as images,
        wl.expires_at,
        u.name as user_name,
        u.surname as user_surname,
        u.email as user_email,
        u.phone as user_phone,
        wb.name as brand_name,
        wp.name as product_name
      FROM watch_listings wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      LEFT JOIN watch_products wp ON wl.product_id = wp.id
      WHERE wl.status = 'pending'
    `;
    
    const queryParams = [];
    
    // Arama filtresi
    if (search) {
      query += ` AND (LOWER(wl.title) LIKE LOWER($${queryParams.length + 1}) OR LOWER(wl.description) LIKE LOWER($${queryParams.length + 1}))`;
      queryParams.push(`%${search}%`);
    }
    
    // Sıralama ve sayfalama
    query += ` ORDER BY wl.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit));
    queryParams.push(offset);

    const result = await db.query(query, queryParams);
    
    // Toplam kayıt sayısını al
    let countQuery = `
      SELECT COUNT(*) as total
      FROM watch_listings wl
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      WHERE wl.status = 'pending'
    `;
    
    const countParams = [];
    if (search) {
      countQuery += ` AND (LOWER(wl.title) LIKE LOWER($${countParams.length + 1}) OR LOWER(wl.description) LIKE LOWER($${countParams.length + 1}))`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Bekleyen saat ilanları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen saat ilanları getirilemedi'
    });
  }
};

// Admin için saat ilanını onayla
const approveWatchListing = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;

    // Mevcut durumu kontrol et
    const currentListing = await db.query(
      'SELECT status, user_id, title FROM watch_listings WHERE id = $1', 
      [id]
    );
    
    if (currentListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat ilanı bulunamadı'
      });
    }

    const { status: currentStatus, user_id, title } = currentListing.rows[0];

    // İlanı onayla ve süreyi yeniden hesapla
    const result = await db.query(`
      UPDATE watch_listings 
      SET status = 'approved', 
          updated_at = NOW(),
          expires_at = NOW() + INTERVAL '1 day' * duration_days,
          rejection_reason = NULL
      WHERE id = $1
      RETURNING *
    `, [id]);

    const message = currentStatus === 'rejected' 
      ? 'Saat ilanı başarıyla yeniden onaylandı ve süre başlatıldı'
      : 'Saat ilanı başarıyla onaylandı ve süre başlatıldı';

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
          category: 'watch',
        }
      );
      console.log('✅ Bildirim gönderildi:', notifResult);
    } catch (notifError) {
      console.error('❌ Bildirim gönderilemedi:', notifError);
    }

    res.json({
      success: true,
      message,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Saat ilanı onaylanırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat ilanı onaylanamadı'
    });
  }
};

// Admin için saat ilanını reddet
const rejectWatchListing = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;
    const { rejection_reason } = req.body;

    // Mevcut durumu kontrol et
    const currentListing = await db.query(
      'SELECT status, user_id, title FROM watch_listings WHERE id = $1', 
      [id]
    );
    
    if (currentListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat ilanı bulunamadı'
      });
    }

    const { status: currentStatus, user_id, title } = currentListing.rows[0];

    const result = await db.query(`
      UPDATE watch_listings 
      SET status = 'rejected', 
          rejection_reason = $1, 
          updated_at = NOW(),
          expires_at = NULL
      WHERE id = $2
      RETURNING *
    `, [rejection_reason, id]);

    const message = currentStatus === 'approved' 
      ? 'Onaylanmış ilan başarıyla reddedildi'
      : 'Saat ilanı başarıyla reddedildi';

    // Bildirim gönder
    try {
      console.log('📱 Bildirim gönderiliyor (red):', { user_id, title });
      const notificationService = require('../../services/notificationService');
      await notificationService.sendToUser(
        user_id,
        {
          title: '❌ İlanınız Reddedildi',
          body: `"${title}" ilanınız reddedildi. Sebep: ${rejection_reason}`,
        },
        {
          type: 'listing_rejected',
          listingId: id.toString(),
          category: 'watch',
        }
      );
      console.log('✅ Red bildirimi gönderildi');
    } catch (notifError) {
      console.error('❌ Bildirim gönderilemedi:', notifError);
    }

    res.json({
      success: true,
      message,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Saat ilanı reddedilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat ilanı reddedilemedi'
    });
  }
};

// Admin tarafından saat ilanı silme
const deleteWatchListingByAdmin = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;

    // İlanın var olup olmadığını kontrol et
    const checkResult = await db.query(
      'SELECT id, title FROM watch_listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat ilanı bulunamadı'
      });
    }

    // İlanı sil
    await db.query('DELETE FROM watch_listings WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Saat ilanı başarıyla silindi'
    });
  } catch (error) {
    console.error('Saat ilanı silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat ilanı silinirken bir hata oluştu'
    });
  }
};

// Admin için saat ilanı süre uzatma fonksiyonu
const extendWatchListingDuration = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { id } = req.params;

    // İlanın var olup olmadığını ve durumunu kontrol et
    const checkResult = await db.query(
      'SELECT id, title, status, expires_at FROM watch_listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat ilanı bulunamadı'
      });
    }

    const listing = checkResult.rows[0];

    // Sadece süresi dolmuş veya onaylanmış ilanların süresini uzatabilir
    if (listing.status !== 'expired' && listing.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Sadece süresi dolmuş veya onaylanmış ilanların süresi uzatılabilir'
      });
    }

    // İlanın süresini 7 gün uzat ve durumunu approved yap
    const result = await db.query(
      'UPDATE watch_listings SET expires_at = NOW() + INTERVAL \'7 days\', status = \'approved\', updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({
      success: true,
      message: 'Saat ilanının süresi başarıyla uzatıldı',
      data: {
        id: result.rows[0].id,
        title: result.rows[0].title,
        status: result.rows[0].status,
        expires_at: result.rows[0].expires_at,
        newExpiryDate: result.rows[0].expires_at
      }
    });

  } catch (error) {
    console.error('Saat ilanı süresi uzatılırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat ilanı süresi uzatılamadı'
    });
  }
};

// Admin - Saat markası sıralamasını güncelle
const updateWatchBrandOrder = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bu işlem için admin yetkisi gerekli' });
    }

    let { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: 'orders alanı bir dizi olmalıdır' });
    }

    orders = orders
      .map((item, idx) => {
        const id = parseInt(item.id ?? item.brand_id ?? item.brandId ?? item.item_id);
        const rawOrder = item.order_index ?? item.order ?? item.position ?? (idx + 1);
        const orderIndex = parseInt(rawOrder);
        return { id, order_index: orderIndex };
      })
      .filter((x) => Number.isInteger(x.id) && Number.isInteger(x.order_index));

    if (!orders.length) {
      return res.status(400).json({ success: false, message: 'Geçerli öğe bulunamadı: id ve order_index gerekli' });
    }

    // Transaction başlat
    await db.query('BEGIN');

    try {
      for (const order of orders) {
        await db.query(
          'UPDATE watch_brands SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [order.order_index, order.id]
        );
      }

      await db.query('COMMIT');

      return res.json({
        success: true,
        message: 'Saat markası sıralaması güncellendi',
        data: { updatedCount: orders.length }
      });
    } catch (txError) {
      await db.query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    console.error('Saat markası sıralaması güncelleme hatası:', error);
    return res.status(500).json({ success: false, message: 'Saat markası sıralaması güncellenemedi' });
  }
};

// Admin - Saat modeli sıralamasını güncelle
const updateWatchModelOrder = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bu işlem için admin yetkisi gerekli' });
    }

    let { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: 'orders alanı bir dizi olmalıdır' });
    }

    orders = orders
      .map((item, idx) => {
        const id = parseInt(item.id ?? item.model_id ?? item.product_id ?? item.item_id);
        const rawOrder = item.order_index ?? item.order ?? item.position ?? (idx + 1);
        const orderIndex = parseInt(rawOrder);
        return { id, order_index: orderIndex };
      })
      .filter((x) => Number.isInteger(x.id) && Number.isInteger(x.order_index));

    if (!orders.length) {
      return res.status(400).json({ success: false, message: 'Geçerli öğe bulunamadı: id ve order_index gerekli' });
    }

    // Transaction başlat
    await db.query('BEGIN');

    try {
      for (const order of orders) {
        await db.query(
          'UPDATE watch_products SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [order.order_index, order.id]
        );
      }

      await db.query('COMMIT');

      return res.json({
        success: true,
        message: 'Saat modeli sıralaması güncellendi',
        data: { updatedCount: orders.length }
      });
    } catch (txError) {
      await db.query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    console.error('Saat modeli sıralaması güncelleme hatası:', error);
    return res.status(500).json({ success: false, message: 'Saat modeli sıralaması güncellenemedi' });
  }
};

module.exports = {
  requireAdmin: process.env.NODE_ENV === 'production' ? requireAdmin : requireAdminDev,
  watchBrandUpload,
  watchModelUpload,
  // Saat markası yönetimi
  getWatchBrandsForAdmin,
  createWatchBrand,
  updateWatchBrand,
  deleteWatchBrand,
  updateWatchBrandOrder,
  // Saat modeli yönetimi
  getAllWatchModels,
  createWatchModel,
  updateWatchModel,
  deleteWatchModel,
  toggleWatchModelStatus,
  updateWatchModelOrder,
  // Saat ilanı yönetimi
  getAllWatchListingsForAdmin,
  getPendingWatchListings,
  approveWatchListing,
  rejectWatchListing,
  deleteWatchListingByAdmin,
  extendWatchListingDuration
};