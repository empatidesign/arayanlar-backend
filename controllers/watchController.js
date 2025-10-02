const db = require('../services/database');

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
      WHERE brand_id = $1
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
    const product = await db.get(`
      SELECT 
        p.product_id,
        p.product_name,
        p.model_name,
        p.price_range_min,
        p.price_range_max,
        p.description,
        p.specifications,
        p.warranty_info,
        b.brand_name,
        b.brand_logo
      FROM watch_products p
      JOIN watch_brands b ON p.brand_id = b.brand_id
      WHERE p.product_id = ? AND p.is_active = 1
    `, [productId]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Ürünün renk seçenekleri ve resimleri
    const colors = await db.all(`
      SELECT 
        c.color_id,
        c.color_name,
        c.color_code,
        c.stock_status,
        GROUP_CONCAT(ci.image_url) as images
      FROM watch_product_colors c
      LEFT JOIN watch_color_images ci ON c.color_id = ci.color_id
      WHERE c.product_id = ? AND c.is_active = 1
      GROUP BY c.color_id, c.color_name, c.color_code, c.stock_status
      ORDER BY c.color_name ASC
    `, [productId]);

    // Resimleri array'e çevir
    const colorsWithImages = colors.map(color => ({
      ...color,
      images: color.images ? color.images.split(',') : []
    }));

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
    const brands = await db.all(`
      SELECT 
        b.brand_id,
        b.brand_name,
        b.brand_logo,
        COUNT(p.product_id) as product_count
      FROM watch_brands b
      LEFT JOIN watch_products p ON b.brand_id = p.brand_id AND p.is_active = 1
      WHERE b.is_active = 1 AND b.is_popular = 1
      GROUP BY b.brand_id, b.brand_name, b.brand_logo
      ORDER BY product_count DESC, b.brand_name ASC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: brands
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
    
    let whereConditions = ['p.is_active = 1'];
    let params = [];
    
    if (query) {
      whereConditions.push('(p.product_name LIKE ? OR p.model_name LIKE ? OR b.brand_name LIKE ?)');
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (brandId) {
      whereConditions.push('p.brand_id = ?');
      params.push(brandId);
    }
    
    if (minPrice) {
      whereConditions.push('p.price_range_min >= ?');
      params.push(minPrice);
    }
    
    if (maxPrice) {
      whereConditions.push('p.price_range_max <= ?');
      params.push(maxPrice);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const products = await db.all(`
      SELECT 
        p.product_id,
        p.product_name,
        p.model_name,
        p.price_range_min,
        p.price_range_max,
        p.image_url,
        b.brand_name
      FROM watch_products p
      JOIN watch_brands b ON p.brand_id = b.brand_id
      WHERE ${whereClause}
      ORDER BY p.product_name ASC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    // Toplam sayıyı al
    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM watch_products p
      JOIN watch_brands b ON p.brand_id = b.brand_id
      WHERE ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.count,
          totalPages: Math.ceil(totalCount.count / limit)
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
      WHERE id = $1
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
        user_id, product_id, brand_id, category_id, color_id,
        title, description, price, currency,
        location_city, location_district, location_address,
        contact_phone, contact_email, contact_whatsapp,
        is_urgent, images, main_image, category_data,
        package_type, package_name, package_price, duration_days,
        has_serious_buyer_badge, expires_at, status, is_active
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25, 'pending', true
      ) RETURNING id
    `, [
      user_id, product_id, brand_id, category_id, color_id,
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
        wb.name as brand_name,
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
        u.name as username,
        u.email as user_email,
        u.profile_image_url,
        u.phone as user_phone,
        u.created_at as user_created_at,
        wb.name as brand_name
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