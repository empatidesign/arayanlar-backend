const db = require('../services/database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Multer konfigürasyonu - marka logoları için
const brandStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'watch-brands');
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

// Multer konfigürasyonu - model görselleri için
const modelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    
    // Color images için ayrı klasör
    if (file.fieldname.startsWith('color_image_')) {
      uploadPath = path.join(__dirname, '..', 'uploads', 'watch-models', 'colors');
    } else {
      uploadPath = path.join(__dirname, '..', 'uploads', 'watch-models');
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

const upload = multer({ storage: brandStorage });
const modelUpload = multer({ 
  storage: modelStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'color_image_0', maxCount: 1 },
  { name: 'color_image_1', maxCount: 1 },
  { name: 'color_image_2', maxCount: 1 },
  { name: 'color_image_3', maxCount: 1 },
  { name: 'color_image_4', maxCount: 1 },
  { name: 'color_image_5', maxCount: 1 },
  { name: 'color_image_6', maxCount: 1 },
  { name: 'color_image_7', maxCount: 1 },
  { name: 'color_image_8', maxCount: 1 },
  { name: 'color_image_9', maxCount: 1 }
]);

// Saat markalarını listele
const getWatchBrands = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT id, name, category_id, image, created_at, updated_at
      FROM watch_brands 
      ORDER BY name ASC
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

// Markaya göre saat ürünlerini listele
const getWatchProductsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    
    const result = await db.query(`
      SELECT 
        id as product_id,
        name as product_name,
        model,
        description,
        image,
        created_at,
        updated_at,
        images,
        colors,
        specifications,
        category_id
      FROM watch_products
      WHERE brand_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [brandId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Marka ürünleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Marka ürünleri getirilemedi'
    });
  }
};

// Ürün detayları ve renk seçeneklerini getir
const getWatchProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Ürün temel bilgileri
    const productResult = await db.query(`
      SELECT 
        wp.id as product_id,
        wp.name as product_name,
        wp.model as model_name,
        wp.description,
        wp.specifications,
        wp.colors,
        wb.name as brand_name,
        wb.image as brand_logo
      FROM watch_products wp
      JOIN watch_brands wb ON wp.brand_id = wb.id
      WHERE wp.id = $1 AND wp.is_active = true
    `, [productId]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    const product = productResult.rows[0];

    // Ürün renklerini JSON'dan parse et
    let colorsWithImages = [];
    if (product.colors) {
      try {
        const parsedColors = JSON.parse(product.colors);
        colorsWithImages = parsedColors || [];
      } catch (error) {
        console.error('Renk verisi parse edilemedi:', error);
        colorsWithImages = [];
      }
    }

    res.json({
      success: true,
      data: {
        product,
        colors: colorsWithImages
      }
    });
  } catch (error) {
    console.error('Ürün detayları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün detayları getirilemedi'
    });
  }
};

// Belirli bir rengin resimlerini getir
const getColorImages = async (req, res) => {
  try {
    const { colorId } = req.params;
    
    const images = await db.all(`
      SELECT 
        image_id,
        image_url,
        image_order,
        is_primary
      FROM watch_color_images
      WHERE color_id = ?
      ORDER BY image_order ASC, is_primary DESC
    `, [colorId]);

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('Renk resimleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Renk resimleri getirilemedi'
    });
  }
};

// Popüler saat markalarını getir (ana sayfada göstermek için)
const getPopularWatchBrands = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        wb.id as brand_id,
        wb.name as brand_name,
        wb.image as brand_logo,
        COUNT(wp.id) as product_count
      FROM watch_brands wb
      LEFT JOIN watch_products wp ON wb.id = wp.brand_id AND wp.is_active = true
      WHERE wb.is_active = true
      GROUP BY wb.id, wb.name, wb.image
      ORDER BY product_count DESC, wb.name ASC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Popüler markalar getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Popüler markalar getirilemedi'
    });
  }
};

// Saat arama fonksiyonu
const searchWatches = async (req, res) => {
  try {
    const { query, brandId, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['wp.is_active = true'];
    let params = [];
    
    if (query) {
      whereConditions.push('(wp.name LIKE $' + (params.length + 1) + ' OR wp.model LIKE $' + (params.length + 2) + ' OR wb.name LIKE $' + (params.length + 3) + ')');
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (brandId) {
      whereConditions.push('wp.brand_id = $' + (params.length + 1));
      params.push(brandId);
    }
    
    if (minPrice) {
      whereConditions.push('wp.price_range_min >= $' + (params.length + 1));
      params.push(minPrice);
    }
    
    if (maxPrice) {
      whereConditions.push('wp.price_range_max <= $' + (params.length + 1));
      params.push(maxPrice);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const productsResult = await db.query(`
      SELECT 
        wp.id as product_id,
        wp.name as product_name,
        wp.model as model_name,
        wp.description,
        wp.image,
        wb.name as brand_name
      FROM watch_products wp
      JOIN watch_brands wb ON wp.brand_id = wb.id
      WHERE ${whereClause}
      ORDER BY wp.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    // Toplam sayıyı al
    const totalCountResult = await db.query(`
      SELECT COUNT(*) as count
      FROM watch_products wp
      JOIN watch_brands wb ON wp.brand_id = wb.id
      WHERE ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        products: productsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCountResult.rows[0].count,
          totalPages: Math.ceil(totalCountResult.rows[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Saat arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Arama işlemi başarısız'
    });
  }
};

// Ürün renklerini getir
const getProductColors = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await db.query(`
      SELECT colors
      FROM watch_products
      WHERE id = $1 AND is_active = true
    `, [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    const product = result.rows[0];
    let colors = [];
    
    try {
      // colors JSONB alanını parse et
      colors = product.colors || [];
      if (typeof colors === 'string') {
        colors = JSON.parse(colors);
      }
    } catch (parseError) {
      console.error('Renk verisi parse edilemedi:', parseError);
      colors = [];
    }

    res.json({
      success: true,
      colors: colors
    });
  } catch (error) {
    console.error('Ürün renkleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün renkleri getirilemedi'
    });
  }
};

// Mobile listings - İlan oluştur
const createMobileListing = async (req, res) => {
  try {
    const {
      user_id,
      product_id,
      brand_id,
      brand_name, // Marka adını ayrı olarak al
      model_name, // Model adını ayrı olarak al
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
      images = [],
      main_image,
      category_data = {},
      package_type = 'free',
      package_name,
      package_price = 0,
      duration_days = 7,
      has_serious_buyer_badge = false
    } = req.body;

    // Gerekli alanları kontrol et
    if (!user_id || !title || !description || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Gerekli alanlar eksik: user_id, title, description, price, category_id'
      });
    }

    // İlan sona erme tarihini hesapla
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration_days);

    // İlanı veritabanına kaydet
    const result = await db.query(`
      INSERT INTO watch_listings (
        user_id, product_id, brand_id, brand_name, model_name, category_id, color_id,
        title, description, price, currency,
        location_city, location_district, location_address,
        contact_phone, contact_email, contact_whatsapp,
        is_urgent, images, main_image, category_data,
        package_type, package_name, package_price, duration_days,
        has_serious_buyer_badge, expires_at, status, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, 'pending', true
      ) RETURNING id
    `, [
      user_id, product_id, brand_id, brand_name, model_name, category_id, color_id,
      title, description, price, currency,
      location_city, location_district, location_address,
      contact_phone, contact_email, contact_whatsapp,
      is_urgent, JSON.stringify(images), main_image, JSON.stringify(category_data),
      package_type, package_name, package_price, duration_days,
      has_serious_buyer_badge, expiresAt
    ]);

    const listingId = result.rows[0].id;

    res.status(201).json({
      success: true,
      message: 'İlan başarıyla oluşturuldu',
      data: {
        listing_id: listingId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('İlan oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan oluşturulamadı'
    });
  }
};

const getMobileListings = async (req, res) => {
  try {
    const { 
      category_id, 
      page = 1, 
      limit = 20,
      brand,
      min_price,
      max_price,
      city,
      gender,
      condition,
      box,
      certificate
    } = req.query;
    
    // Sayfalama hesaplamaları
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        wl.*,
        u.name as user_name,
        u.profile_image_url as user_profile_image,
        wb.name as brand_name_from_table,
        wp.name as product_name,
        wp.image as product_image
      FROM watch_listings wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      LEFT JOIN watch_products wp ON wl.product_id = wp.id
      WHERE wl.is_active = true AND wl.status = 'approved'
    `;
    
    const queryParams = [];
    
    // Kategori filtresi
    if (category_id) {
      query += ` AND wl.category_id = $${queryParams.length + 1}`;
      queryParams.push(category_id);
    }
    
    // Marka filtresi
    if (brand) {
      query += ` AND LOWER(wb.name) = LOWER($${queryParams.length + 1})`;
      queryParams.push(brand);
    }
    
    // Fiyat filtreleri
    if (min_price) {
      query += ` AND wl.price >= $${queryParams.length + 1}`;
      queryParams.push(parseFloat(min_price));
    }
    
    if (max_price) {
      query += ` AND wl.price <= $${queryParams.length + 1}`;
      queryParams.push(parseFloat(max_price));
    }
    
    // Şehir filtresi
    if (city) {
      query += ` AND LOWER(wl.location_city) = LOWER($${queryParams.length + 1})`;
      queryParams.push(city);
    }
    
    // Cinsiyet filtresi (category_data JSON alanından)
    if (gender) {
      query += ` AND wl.category_data->>'cinsiyet' = $${queryParams.length + 1}`;
      queryParams.push(gender);
    }
    
    // Kullanım durumu filtresi (category_data JSON alanından)
    if (condition) {
      query += ` AND wl.category_data->>'kullanim_durumu' = $${queryParams.length + 1}`;
      queryParams.push(condition);
    }
    
    // Kutu filtresi (category_data JSON alanından)
    if (box) {
      // set_icerigi.kutu boolean değerini kontrol et
      if (box === 'var') {
        query += ` AND (wl.category_data->'set_icerigi'->>'kutu')::boolean = true`;
      } else if (box === 'yok') {
        query += ` AND (wl.category_data->'set_icerigi'->>'kutu')::boolean = false`;
      }
    }
    
    // Sertifika filtresi (category_data JSON alanından)
    if (certificate) {
      // set_icerigi.sertifika boolean değerini kontrol et
      if (certificate === 'var') {
        query += ` AND (wl.category_data->'set_icerigi'->>'sertifika')::boolean = true`;
      } else if (certificate === 'yok') {
        query += ` AND (wl.category_data->'set_icerigi'->>'sertifika')::boolean = false`;
      }
    }
    
    // Sıralama ve sayfalama
    query += ` ORDER BY wl.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await db.query(query, queryParams);
    
    // Toplam kayıt sayısını al
    let countQuery = `
      SELECT COUNT(*) as total
      FROM watch_listings wl
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      WHERE wl.is_active = true AND wl.status = 'approved'
    `;
    
    const countParams = [];
    
    // Aynı filtreleri count query'sine de ekle
    if (category_id) {
      countQuery += ` AND wl.category_id = $${countParams.length + 1}`;
      countParams.push(category_id);
    }
    
    if (brand) {
      countQuery += ` AND LOWER(wb.name) = LOWER($${countParams.length + 1})`;
      countParams.push(brand);
    }
    
    if (min_price) {
      countQuery += ` AND wl.price >= $${countParams.length + 1}`;
      countParams.push(parseFloat(min_price));
    }
    
    if (max_price) {
      countQuery += ` AND wl.price <= $${countParams.length + 1}`;
      countParams.push(parseFloat(max_price));
    }
    
    if (city) {
      countQuery += ` AND LOWER(wl.location_city) = LOWER($${countParams.length + 1})`;
      countParams.push(city);
    }
    
    if (gender) {
      countQuery += ` AND wl.category_data->>'cinsiyet' = $${countParams.length + 1}`;
      countParams.push(gender);
    }
    
    if (condition) {
      countQuery += ` AND wl.category_data->>'kullanim_durumu' = $${countParams.length + 1}`;
      countParams.push(condition);
    }
    
    if (box) {
      countQuery += ` AND wl.category_data->>'kutu' = $${countParams.length + 1}`;
      countParams.push(box);
    }
    
    if (certificate) {
      countQuery += ` AND wl.category_data->>'sertifika' = $${countParams.length + 1}`;
      countParams.push(certificate);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        listings: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('İlanları getirirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlanlar getirilemedi'
    });
  }
};

const getMobileListingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'İlan ID gerekli'
      });
    }

    const query = `
      SELECT 
        wl.id,
        wl.title,
        wl.description,
        wl.price,
        wl.currency,
        wl.location_city,
        wl.location_district,
        wl.location_address,
        wl.images,
        wl.main_image,
        wl.contact_phone,
        wl.contact_email,
        wl.contact_whatsapp,
        wl.category_data,
        wl.created_at,
        wl.updated_at,
        wl.category_id,
        wl.user_id,
        wl.is_urgent,
        wl.is_featured,
        wl.view_count,
        wl.favorite_count,
        wl.brand_name,
        wl.model_name,
        u.name as username,
        u.surname as user_surname,
        u.email as user_email,
        u.profile_image_url,
        u.phone as user_phone,
        u.created_at as user_created_at,
        wb.name as brand_name_from_table
      FROM watch_listings wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      WHERE wl.id = $1 AND wl.is_active = true AND wl.status = 'approved'
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const listing = result.rows[0];

    // Parse images if they exist
    if (listing.images) {
      try {
        listing.images = JSON.parse(listing.images);
      } catch (e) {
        listing.images = [];
      }
    } else {
      listing.images = [];
    }

    // Parse category_data if it exists
    if (listing.category_data) {
      try {
        // If it's already an object, don't parse it
        if (typeof listing.category_data === 'object') {
          // It's already parsed by PostgreSQL
        } else {
          listing.category_data = JSON.parse(listing.category_data);
        }
      } catch (e) {
        listing.category_data = {};
      }
    } else {
      listing.category_data = {};
    }

    res.json({
      success: true,
      data: listing
    });

  } catch (error) {
    console.error('İlan detayı getirirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan detayı getirilemedi'
    });
  }
};

// Admin için saat markası oluştur
const createWatchBrand = async (req, res) => {
  try {
    const { name, country, description } = req.body;
    
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
      INSERT INTO watch_brands (name, image, country, description, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `, [name, logo_url, country, description]);

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
    const { id } = req.params;
    const { name } = req.body;

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

// Admin için tüm saat modellerini listele
const getAllWatchModels = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT wp.id, wp.name, wp.brand_id, wp.image, wp.created_at, wp.updated_at,
             wp.description, wp.model, wp.specifications, wp.images, wp.colors, wp.category_id,
             wp.is_active, wb.name as brand_name
      FROM watch_products wp
      LEFT JOIN watch_brands wb ON wp.brand_id = wb.id
      ORDER BY wb.name ASC, wp.name ASC
    `);

    // Fix color image paths for compatibility
    const processedData = result.rows.map(row => {
      if (row.colors) {
        try {
          const colors = typeof row.colors === 'string' ? JSON.parse(row.colors) : row.colors;
          if (Array.isArray(colors)) {
            const updatedColors = colors.map(color => {
              if (color.image && color.image.includes('/uploads/models/colors/')) {
                // Update old path to new path
                return {
                  ...color,
                  image: color.image.replace('/uploads/models/colors/', '/uploads/watch-models/colors/')
                };
              }
              return color;
            });
            return {
              ...row,
              colors: JSON.stringify(updatedColors)
            };
          }
        } catch (error) {
          console.error('Error processing colors for model:', row.id, error);
        }
      }
      return row;
    });

    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Saat modelleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Saat modelleri getirilemedi'
    });
  }
};

// Admin için saat modeli oluştur
const createWatchModel = async (req, res) => {
  try {
    const { 
      brand_id, 
      name, 
      model,
      colors,
      description
    } = req.body;
    
    if (!brand_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Marka ID ve model adı gerekli'
      });
    }

    let image_url = null;
    if (req.files && req.files['image']) {
      image_url = `/uploads/watch-models/${req.files['image'][0].filename}`;
    }

    // Process colors data and handle color images
    let processedColors = null;
    if (colors) {
      try {
        const colorsData = typeof colors === 'string' ? JSON.parse(colors) : colors;
        processedColors = [];
        
        for (let i = 0; i < colorsData.length; i++) {
          const color = colorsData[i];
          const processedColor = {
            name: color.name,
            hex: color.hex,
            image: null
          };
          
          // Check if there's a color image file for this color
          const colorImageKey = `color_image_${i}`;
          if (req.files && req.files[colorImageKey]) {
            const colorImageFile = req.files[colorImageKey][0];
            processedColor.image = `/uploads/watch-models/colors/${colorImageFile.filename}`;
          }
          
          processedColors.push(processedColor);
        }
      } catch (error) {
        console.error('Error processing colors:', error);
        processedColors = null;
      }
    }

    const result = await db.query(`
      INSERT INTO watch_products (
        brand_id, name, model, image, colors, description, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [
      brand_id, name, model, image_url, processedColors ? JSON.stringify(processedColors) : null, description, true
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
    const { id } = req.params;
    const { 
      brand_id, 
      name, 
      model,
      colors,
      description
    } = req.body;

    // Mevcut modeli kontrol et
    const existingModel = await db.query('SELECT * FROM watch_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat modeli bulunamadı'
      });
    }

    let image_url = existingModel.rows[0].image;
    if (req.files && req.files['image']) {
      image_url = `/uploads/watch-models/${req.files['image'][0].filename}`;
      
      // Eski resmi sil
      if (existingModel.rows[0].image) {
        const oldImagePath = path.join(__dirname, '..', existingModel.rows[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    // Process colors data and handle color images
    let processedColors = null;
    if (colors) {
      try {
        const colorsData = typeof colors === 'string' ? JSON.parse(colors) : colors;
        processedColors = [];
        
        for (let i = 0; i < colorsData.length; i++) {
          const color = colorsData[i];
          const processedColor = {
            name: color.name,
            hex: color.hex,
            image: color.image || null // Keep existing image if no new one
          };
          
          // Check if there's a new color image file for this color
          const colorImageKey = `color_image_${i}`;
          if (req.files && req.files[colorImageKey]) {
            const colorImageFile = req.files[colorImageKey][0];
            processedColor.image = `/uploads/watch-models/colors/${colorImageFile.filename}`;
          }
          
          processedColors.push(processedColor);
        }
      } catch (error) {
        console.error('Error processing colors:', error);
        processedColors = existingModel.rows[0].colors ? JSON.parse(existingModel.rows[0].colors) : null;
      }
    }

    const result = await db.query(`
      UPDATE watch_products 
      SET brand_id = COALESCE($1, brand_id),
          name = COALESCE($2, name),
          model = COALESCE($3, model),
          image = $4,
          colors = $5,
          description = COALESCE($6, description),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      brand_id, name, model, image_url, processedColors ? JSON.stringify(processedColors) : null, description, id
    ]);

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
    const { id } = req.params;

    // Mevcut modeli kontrol et
    const existingModel = await db.query('SELECT * FROM watch_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat modeli bulunamadı'
      });
    }

    // Modele ait ilanlar var mı kontrol et
    const listingsCount = await db.query('SELECT COUNT(*) FROM watch_listings WHERE product_id = $1', [id]);
    if (parseInt(listingsCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu modele ait ilanlar bulunduğu için silinemez'
      });
    }

    // Resmi sil
    if (existingModel.rows[0].image) {
      const imagePath = path.join(__dirname, '..', existingModel.rows[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
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
    const { id } = req.params;

    // Mevcut modeli kontrol et
    const existingModel = await db.query('SELECT * FROM watch_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat modeli bulunamadı'
      });
    }

    // Durumu tersine çevir
    const currentStatus = existingModel.rows[0].is_active;
    const newStatus = !currentStatus;

    await db.query(
      'UPDATE watch_products SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Model ${newStatus ? 'aktif' : 'pasif'} hale getirildi`,
      data: {
        id: id,
        is_active: newStatus
      }
    });
  } catch (error) {
    console.error('Model durumu güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Model durumu güncellenemedi',
      error: error.message
    });
  }
};

// Admin için tüm saat ilanlarını getir
const getAllWatchListingsForAdmin = async (req, res) => {
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
        wl.*,
        wl.title as title,
        wl.main_image as main_image,
        wl.price as price,
        wl.location_city as location_city,
        wl.description as description,
        wl.images as images,
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
    
    // Marka filtresi
    if (brand) {
      query += ` AND LOWER(wb.name) LIKE LOWER($${queryParams.length + 1})`;
      queryParams.push(`%${brand}%`);
    }
    
    // Arama filtresi
    if (search) {
      query += ` AND (LOWER(wl.title) LIKE LOWER($${queryParams.length + 1}) OR LOWER(wl.description) LIKE LOWER($${queryParams.length + 1}))`;
      queryParams.push(`%${search}%`);
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
    
    if (brand) {
      countQuery += ` AND LOWER(wb.name) LIKE LOWER($${countParams.length + 1})`;
      countParams.push(`%${brand}%`);
    }
    
    if (search) {
      countQuery += ` AND (LOWER(wl.title) LIKE LOWER($${countParams.length + 1}) OR LOWER(wl.description) LIKE LOWER($${countParams.length + 1}))`;
      countParams.push(`%${search}%`);
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

// Admin için saat ilanını onayla
const approveWatchListing = async (req, res) => {
  try {
    const { id } = req.params;

    // Mevcut durumu kontrol et
    const currentListing = await db.query('SELECT status FROM watch_listings WHERE id = $1', [id]);
    
    if (currentListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat ilanı bulunamadı'
      });
    }

    const currentStatus = currentListing.rows[0].status;

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
    const { id } = req.params;
    const { rejection_reason } = req.body;

    // Mevcut durumu kontrol et
    const currentListing = await db.query('SELECT status FROM watch_listings WHERE id = $1', [id]);
    
    if (currentListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saat ilanı bulunamadı'
      });
    }

    const currentStatus = currentListing.rows[0].status;

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

// Admin için bekleyen saat ilanlarını getir
const getPendingWatchListings = async (req, res) => {
  try {
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

// Admin tarafından saat ilanı silme
const deleteWatchListingByAdmin = async (req, res) => {
  try {
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

module.exports = {
  getWatchBrands,
  getWatchProductsByBrand,
  getWatchProductDetails,
  getColorImages,
  getPopularWatchBrands,
  searchWatches,
  getProductColors,
  createMobileListing,
  getMobileListings,
  getMobileListingById,
  createWatchBrand,
  updateWatchBrand,
  deleteWatchBrand,
  getAllWatchModels,
  createWatchModel,
  updateWatchModel,
  deleteWatchModel,
  toggleWatchModelStatus,
  getAllWatchListingsForAdmin,
  getPendingWatchListings,
  approveWatchListing,
  rejectWatchListing,
  deleteWatchListingByAdmin,
  upload,
  modelUpload
};