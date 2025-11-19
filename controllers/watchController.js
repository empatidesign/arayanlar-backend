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
      SELECT DISTINCT id, name, category_id, image, order_index, created_at, updated_at
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
        category_id,
        order_index
      FROM watch_products
      WHERE brand_id = $1 AND is_active = true
      ORDER BY order_index ASC NULLS LAST, name ASC
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
    const { gender } = req.query; // Cinsiyet filtresi için query parametresi
    
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
        
        // Eğer gender parametresi varsa, renkleri filtrele
        if (gender && ['male', 'female', 'unisex'].includes(gender)) {
          colorsWithImages = colorsWithImages.filter(color => {
            // Unisex renkler her zaman gösterilir
            if (color.gender === 'unisex') return true;
            // Seçilen cinsiyete uygun renkler gösterilir
            return color.gender === gender;
          });
        }
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
    const { gender } = req.query; // Cinsiyet filtresi için query parametresi
    
    console.log('🎨 [Backend] getProductColors çağrıldı - productId:', productId, 'gender:', gender);
    
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
    console.log('🎨 [Backend] Veritabanından gelen colors:', product.colors);
    
    let colors = [];
    
    try {
      // colors JSONB alanını parse et
      colors = product.colors || [];
      if (typeof colors === 'string') {
        colors = JSON.parse(colors);
      }
      
      console.log('🎨 [Backend] Parse edilmiş renkler:', colors);
      
      // Eğer gender parametresi varsa, renkleri filtrele
      if (gender && ['kadin', 'erkek', 'male', 'female', 'unisex'].includes(gender.toLowerCase())) {
        // Türkçe-İngilizce dönüşümü
        const genderMap = {
          'kadin': 'female',
          'erkek': 'male',
          'male': 'male',
          'female': 'female',
          'unisex': 'unisex'
        };
        const mappedGender = genderMap[gender.toLowerCase()];
        
        console.log('🎨 [Backend] Filtreleme yapılıyor - mappedGender:', mappedGender);
        
        colors = colors.filter(color => {
          // Unisex renkler her zaman gösterilir
          if (color.gender === 'unisex') return true;
          // Seçilen cinsiyete uygun renkler gösterilir
          return color.gender === mappedGender;
        });
        
        console.log('🎨 [Backend] Filtrelenmiş renkler:', colors);
      }
    } catch (parseError) {
      console.error('❌ [Backend] Renk verisi parse edilemedi:', parseError);
      colors = [];
    }

    console.log('🎨 [Backend] Gönderilen yanıt:', { success: true, colors });

    res.json({
      success: true,
      colors: colors
    });
  } catch (error) {
    console.error('❌ [Backend] Ürün renkleri getirilirken hata:', error);
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
      brand_id,
      product_id,
      min_price,
      max_price,
      city,
      gender,
      condition,
      box,
      certificate
    } = req.query;
    
    console.log('⌚ [Backend] getMobileListings called with params:', { 
      category_id, brand, brand_id, product_id, page, limit 
    });
    
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
        AND wl.created_at > NOW() - INTERVAL '7 days'
    `;
    
    const queryParams = [];
    
    // Kategori filtresi
    if (category_id) {
      query += ` AND wl.category_id = $${queryParams.length + 1}`;
      queryParams.push(category_id);
    }
    
    // Marka filtresi (brand_id veya brand name)
    if (brand_id) {
      console.log('⌚ [Backend] Adding brand_id filter:', brand_id);
      query += ` AND wl.brand_id = $${queryParams.length + 1}`;
      queryParams.push(parseInt(brand_id));
    } else if (brand) {
      console.log('⌚ [Backend] Adding brand name filter:', brand);
      query += ` AND LOWER(wb.name) = LOWER($${queryParams.length + 1})`;
      queryParams.push(brand);
    }
    
    // Ürün filtresi
    if (product_id) {
      console.log('⌚ [Backend] Adding product_id filter:', product_id);
      query += ` AND wl.product_id = $${queryParams.length + 1}`;
      queryParams.push(parseInt(product_id));
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
    
    console.log('⌚ [Backend] Final query params:', queryParams);
    console.log('⌚ [Backend] Executing query...');
    
    const result = await db.query(query, queryParams);
    
    console.log(`⌚ [Backend] Query returned ${result.rows.length} listings`);
    
    // Toplam kayıt sayısını al
    let countQuery = `
      SELECT COUNT(*) as total
      FROM watch_listings wl
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      WHERE wl.is_active = true AND wl.status = 'approved'
        AND wl.created_at > NOW() - INTERVAL '7 days'
    `;
    
    const countParams = [];
    
    // Aynı filtreleri count query'sine de ekle
    if (category_id) {
      countQuery += ` AND wl.category_id = $${countParams.length + 1}`;
      countParams.push(category_id);
    }
    
    if (brand_id) {
      countQuery += ` AND wl.brand_id = $${countParams.length + 1}`;
      countParams.push(parseInt(brand_id));
    } else if (brand) {
      countQuery += ` AND LOWER(wb.name) = LOWER($${countParams.length + 1})`;
      countParams.push(brand);
    }
    
    if (product_id) {
      countQuery += ` AND wl.product_id = $${countParams.length + 1}`;
      countParams.push(parseInt(product_id));
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

// Admin için saat markası oluştur - TAŞINDI: adminController.js'e taşındı
// Admin için saat markası güncelle - TAŞINDI: adminController.js'e taşındı  
// Admin için saat markası sil - TAŞINDI: adminController.js'e taşındı

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
  getMobileListingById
};