const db = require('../services/database');
const path = require('path');
const fs = require('fs');

// Araba markalarını listele
const getCarBrands = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        cb.id, 
        cb.name, 
        cb.logo_url, 
        cb.country, 
        cb.is_active, 
        cb.created_at, 
        cb.updated_at,
        COUNT(cp.id) as model_count
      FROM cars_brands cb
      LEFT JOIN cars_products cp ON cb.id = cp.brand_id AND cp.is_active = true
      WHERE cb.is_active = true
      GROUP BY cb.id, cb.name, cb.logo_url, cb.country, cb.is_active, cb.created_at, cb.updated_at
      ORDER BY cb.name ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Araba markaları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba markaları getirilemedi'
    });
  }
};



// ADMIN FUNCTIONS - MOVED TO adminController.js
// These functions have been moved to adminController.js for better organization
// and proper admin authentication/authorization

// Tüm araba modellerini listele (admin için)
const getAllCarModels = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT cp.id, cp.name, cp.brand_id, cp.image_url, cp.is_active, cp.created_at, cp.updated_at,
             cp.description, cp.engine_size, cp.colors,
             cb.name as brand_name
      FROM cars_products cp
      LEFT JOIN cars_brands cb ON cp.brand_id = cb.id
      ORDER BY cb.name ASC, cp.name ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Araba modelleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba modelleri getirilemedi'
    });
  }
};

// Markaya göre araba modellerini listele
const getCarModelsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    
    const result = await db.query(`
      SELECT 
        id as product_id,
        name as product_name,
        model_year_start,
        model_year_end,
        body_type,
        fuel_type,
        transmission,
        engine_size,
        image_url,
        created_at,
        updated_at
      FROM cars_products
      WHERE brand_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [brandId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Marka modelleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Marka modelleri getirilemedi'
    });
  }
};

// Modele göre motor hacmi çeşitlerini getir
const getEnginesByModel = async (req, res) => {
  try {
    const { modelId } = req.params;
    
    // Model için engine_size verisini getir
    const result = await db.query(`
      SELECT 
        id,
        name,
        engine_size
      FROM cars_products
      WHERE id = $1 AND is_active = true
    `, [modelId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Model bulunamadı'
      });
    }

    const model = result.rows[0];
    let engines = [];

    // engine_size'ı virgülle ayır ve ayrı motor boyutları olarak döndür
    if (model.engine_size && model.engine_size.trim()) {
      const engineSizes = model.engine_size.split(',')
        .map(size => size.trim())
        .filter(size => size.length > 0);
      
      engines = engineSizes.map((size, index) => ({
        id: `${model.id}_${index}`,
        size: size
      }));
    }
    // Eğer engine_size yoksa boş array döndür (varsayılan değer verme)

    res.json({
      success: true,
      engines: engines
    });
  } catch (error) {
    console.error('Motor hacmi çeşitleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Motor hacmi çeşitleri getirilemedi'
    });
  }
};

// Model detaylarını getir
const getCarModelDetails = async (req, res) => {
  try {
    const { modelId } = req.params;
    
    // Model temel bilgileri
    const result = await db.query(`
      SELECT 
        cp.id as product_id,
        cp.name as product_name,
        cp.model_year_start,
        cp.model_year_end,
        cp.body_type,
        cp.fuel_type,
        cp.transmission,
        cp.engine_size,
        cb.name as brand_name,
        cb.logo_url as brand_logo,
        cb.country as brand_country
      FROM cars_products cp
      JOIN cars_brands cb ON cp.brand_id = cb.id
      WHERE cp.id = $1 AND cp.is_active = true
    `, [modelId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Model bulunamadı'
      });
    }

    const model = result.rows[0];

    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('Model detayları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Model detayları getirilemedi'
    });
  }
};

// Popüler araba markalarını getir (ana sayfada göstermek için)
const getPopularCarBrands = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        cb.id as brand_id,
        cb.name as brand_name,
        cb.logo_url as brand_logo,
        cb.country,
        COUNT(cp.id) as model_count
      FROM cars_brands cb
      LEFT JOIN cars_products cp ON cb.id = cp.brand_id AND cp.is_active = true
      WHERE cb.is_active = true
      GROUP BY cb.id, cb.name, cb.logo_url, cb.country
      HAVING COUNT(cp.id) > 0
      ORDER BY model_count DESC, cb.name ASC
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

// Araba arama fonksiyonu
const searchCars = async (req, res) => {
  try {
    const { 
      query, 
      brandId, 
      bodyType, 
      fuelType, 
      transmission, 
      minYear, 
      maxYear,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = ['cp.is_active = true'];
    let params = [];
    let paramIndex = 1;
    
    if (query) {
      whereConditions.push(`(cp.name ILIKE $${paramIndex} OR cb.name ILIKE $${paramIndex})`);
      const searchTerm = `%${query}%`;
      params.push(searchTerm);
      paramIndex++;
    }
    
    if (brandId) {
      whereConditions.push(`cp.brand_id = $${paramIndex}`);
      params.push(brandId);
      paramIndex++;
    }
    
    if (bodyType) {
      whereConditions.push(`cp.body_type = $${paramIndex}`);
      params.push(bodyType);
      paramIndex++;
    }
    
    if (fuelType) {
      whereConditions.push(`cp.fuel_type = $${paramIndex}`);
      params.push(fuelType);
      paramIndex++;
    }
    
    if (transmission) {
      whereConditions.push(`cp.transmission = $${paramIndex}`);
      params.push(transmission);
      paramIndex++;
    }
    
    if (minYear) {
      whereConditions.push(`cp.model_year_start >= $${paramIndex}`);
      params.push(minYear);
      paramIndex++;
    }
    
    if (maxYear) {
      whereConditions.push(`(cp.model_year_end IS NULL OR cp.model_year_end <= $${paramIndex})`);
      params.push(maxYear);
      paramIndex++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const result = await db.query(`
      SELECT 
        cp.id as product_id,
        cp.name as product_name,
        cp.model_year_start,
        cp.model_year_end,
        cp.body_type,
        cp.fuel_type,
        cp.transmission,
        cp.engine_size,
        cb.name as brand_name,
        cb.logo_url as brand_logo
      FROM cars_products cp
      JOIN cars_brands cb ON cp.brand_id = cb.id
      WHERE ${whereClause}
      ORDER BY cb.name ASC, cp.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);
    
    // Toplam sayıyı al
    const countResult = await db.query(`
      SELECT COUNT(*) as count
      FROM cars_products cp
      JOIN cars_brands cb ON cp.brand_id = cb.id
      WHERE ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        models: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Araba arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Arama işlemi başarısız'
    });
  }
};

// Kasa tiplerini getir
const getBodyTypes = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT body_type
      FROM cars_products
      WHERE body_type IS NOT NULL AND is_active = true
      ORDER BY body_type ASC
    `);

    res.json({
      success: true,
      data: result.rows.map(row => row.body_type)
    });
  } catch (error) {
    console.error('Kasa tipleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Kasa tipleri getirilemedi'
    });
  }
};

// Yakıt tiplerini getir
const getFuelTypes = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT fuel_type
      FROM cars_products
      WHERE fuel_type IS NOT NULL AND is_active = true
      ORDER BY fuel_type ASC
    `);

    res.json({
      success: true,
      data: result.rows.map(row => row.fuel_type)
    });
  } catch (error) {
    console.error('Yakıt tipleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Yakıt tipleri getirilemedi'
    });
  }
};

// Şanzıman tiplerini getir
const getTransmissionTypes = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT transmission
      FROM cars_products
      WHERE transmission IS NOT NULL AND is_active = true
      ORDER BY transmission ASC
    `);

    res.json({
      success: true,
      data: result.rows.map(row => row.transmission)
    });
  } catch (error) {
    console.error('Şanzıman tipleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Şanzıman tipleri getirilemedi'
    });
  }
};

// Araba model renklerini getir
const getCarProductColors = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Araba modeli için renk seçeneklerini getir
    const result = await db.query(`
      SELECT 
        id,
        name,
        colors,
        image_url
      FROM cars_products
      WHERE id = $1 AND is_active = true
    `, [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba modeli bulunamadı'
      });
    }

    const product = result.rows[0];
    let colors = [];
    
    try {
      // colors JSONB alanını parse et
      if (product.colors) {
        colors = typeof product.colors === 'string' ? JSON.parse(product.colors) : product.colors;
        
        // Renk görsel yolu için geriye dönük uyumluluk: farklı klasörleri kontrol et
        const resolveImagePath = (imgPath) => {
          try {
            if (!imgPath) return '';
            const rel = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;
            const abs = path.join(__dirname, '..', rel.replace(/\//g, path.sep));
            if (fs.existsSync(abs)) return imgPath;
            
            // Eğer /uploads/models/colors/ yolunda değilse, /uploads/car-models/ yolunu dene
            if (imgPath.includes('/uploads/models/colors/')) {
              const carModelsPath = imgPath.replace('/uploads/models/colors/', '/uploads/car-models/');
              const carModelsRel = carModelsPath.startsWith('/') ? carModelsPath.substring(1) : carModelsPath;
              const carModelsAbs = path.join(__dirname, '..', carModelsRel.replace(/\//g, path.sep));
              if (fs.existsSync(carModelsAbs)) return carModelsPath;
              
              // Eğer car-models'de de yoksa, models klasörüne düş
              const modelsPath = imgPath.replace('/uploads/models/colors/', '/uploads/models/');
              const modelsRel = modelsPath.startsWith('/') ? modelsPath.substring(1) : modelsPath;
              const modelsAbs = path.join(__dirname, '..', modelsRel.replace(/\//g, path.sep));
              if (fs.existsSync(modelsAbs)) return modelsPath;
            }
            
            // Eğer image path /uploads/car-models/ ile başlamıyorsa, bu yolu dene
            if (!imgPath.includes('/uploads/car-models/')) {
              const filename = imgPath.split('/').pop();
              const carModelsPath = `/uploads/car-models/${filename}`;
              const carModelsRel = carModelsPath.startsWith('/') ? carModelsPath.substring(1) : carModelsPath;
              const carModelsAbs = path.join(__dirname, '..', carModelsRel.replace(/\//g, path.sep));
              if (fs.existsSync(carModelsAbs)) return carModelsPath;
            }
            
            return imgPath;
          } catch (e) {
            return imgPath;
          }
        };
        
        // Her renk için gerekli alanları kontrol et ve düzenle
        colors = colors.map((color, index) => {
          const baseImage = color.image || product.image_url || '';
          const resolvedImage = resolveImagePath(baseImage);
          const imagesArray = color.images && Array.isArray(color.images) ? color.images.map(resolveImagePath) : [resolvedImage];
          return {
            id: color.id || `color-${index}`,
            name: color.name || `Renk ${index + 1}`,
            image: resolvedImage,
            hex: color.hex || '',
            images: imagesArray
          };
        });
      }
    } catch (parseError) {
      console.error('Renk verisi parse edilemedi:', parseError);
      // Varsayılan renk seçenekleri
      colors = [
        {
          id: 'default-1',
          name: 'Varsayılan',
          image: product.image_url || '',
          hex: '#000000',
          images: [product.image_url || '']
        }
      ];
    }

    res.json({
      success: true,
      colors: colors
    });
  } catch (error) {
    console.error('Araba renkleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba renkleri getirilemedi'
    });
  }
};

// Araç ilanlarını getir (mobile API için)
const getCarListings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      brand,
      min_price,
      max_price,
      city,
      model_year_min,
      model_year_max,
      km_max,
      engine_size,
      import_status
    } = req.query;
    
    // Sayfalama hesaplamaları
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        cl.*,
        u.name as user_name,
        u.profile_image_url as user_profile_image
      FROM cars_listings cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE cl.is_active = true AND cl.status = 'approved'
        AND cl.created_at > NOW() - INTERVAL '7 days'
    `;
    
    const queryParams = [];
    
    // Marka filtresi
    if (brand) {
      query += ` AND LOWER(cl.brand_name) = LOWER($${queryParams.length + 1})`;
      queryParams.push(brand);
    }
    
    // Fiyat filtreleri
    if (min_price) {
      query += ` AND cl.price >= $${queryParams.length + 1}`;
      queryParams.push(parseFloat(min_price));
    }
    
    if (max_price) {
      query += ` AND cl.price <= $${queryParams.length + 1}`;
      queryParams.push(parseFloat(max_price));
    }
    
    // Şehir filtresi
    if (city) {
      query += ` AND LOWER(cl.location_city) = LOWER($${queryParams.length + 1})`;
      queryParams.push(city);
    }
    
    // Model yılı filtresi
    if (model_year_min) {
      query += ` AND cl.model_year >= $${queryParams.length + 1}`;
      queryParams.push(parseInt(model_year_min));
    }
    
    if (model_year_max) {
      query += ` AND cl.model_year <= $${queryParams.length + 1}`;
      queryParams.push(parseInt(model_year_max));
    }
    
    // Kilometre filtresi
    if (km_max) {
      query += ` AND cl.km <= $${queryParams.length + 1}`;
      queryParams.push(parseInt(km_max));
    }
    
    // Motor hacmi filtresi
    if (engine_size) {
      query += ` AND cl.engine_size = $${queryParams.length + 1}`;
      queryParams.push(engine_size);
    }
    
    // İthalat durumu filtresi
    if (import_status) {
      query += ` AND cl.import_status = $${queryParams.length + 1}`;
      queryParams.push(import_status);
    }
    
    // Sıralama ve sayfalama
    query += ` ORDER BY cl.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await db.query(query, queryParams);
    
    // Toplam kayıt sayısını al
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cars_listings cl
      WHERE cl.is_active = true AND cl.status = 'approved'
        AND cl.created_at > NOW() - INTERVAL '7 days'
    `;
    
    const countParams = [];
    
    // Aynı filtreleri count query'sine de ekle
    if (brand) {
      countQuery += ` AND LOWER(cl.brand_name) = LOWER($${countParams.length + 1})`;
      countParams.push(brand);
    }
    
    if (min_price) {
      countQuery += ` AND cl.price >= $${countParams.length + 1}`;
      countParams.push(parseFloat(min_price));
    }
    
    if (max_price) {
      countQuery += ` AND cl.price <= $${countParams.length + 1}`;
      countParams.push(parseFloat(max_price));
    }
    
    if (city) {
      countQuery += ` AND LOWER(cl.location_city) = LOWER($${countParams.length + 1})`;
      countParams.push(city);
    }
    
    if (model_year_min) {
      countQuery += ` AND cl.model_year >= $${countParams.length + 1}`;
      countParams.push(parseInt(model_year_min));
    }
    
    if (model_year_max) {
      countQuery += ` AND cl.model_year <= $${countParams.length + 1}`;
      countParams.push(parseInt(model_year_max));
    }
    
    if (km_max) {
      countQuery += ` AND cl.km <= $${countParams.length + 1}`;
      countParams.push(parseInt(km_max));
    }
    
    if (engine_size) {
      countQuery += ` AND cl.engine_size = $${countParams.length + 1}`;
      countParams.push(engine_size);
    }
    
    if (import_status) {
      countQuery += ` AND cl.import_status = $${countParams.length + 1}`;
      countParams.push(import_status);
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
    console.error('Araç ilanları getirirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araç ilanları getirilemedi'
    });
  }
};

// Araç ilanı oluştur
const createCarListing = async (req, res) => {
  try {
    // Debug: Request body'yi logla
    console.log('=== CREATE CAR LISTING DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);
    console.log('User from token:', req.user);
    
    const {
      title,
      description,
      price,
      location_city, // Güncellenmiş alan adı
      product_id,
      brand_id,
      category_id,
      car_details, // Nested obje olarak geliyor
      selected_color_index, // Renk indeksi
      color_id, // Seçilen renk ID'si
      currency = 'TL',
      images = [],
      main_image,
      contact_phone,
      contact_email,
      contact_whatsapp,
      is_urgent = false,
      // Paket bilgileri
      package_type = 'free',
      package_name = 'Standart İlan Paketi',
      package_price = 0,
      duration_days = 7,
      has_serious_buyer_badge = false,
      status = 'pending',
      user_id // Frontend'den gelen user_id
    } = req.body;

    // car_details objesi içindeki verileri çıkar
    const {
      brand,
      model,
      engine_size,
      km,
      model_yili, // Frontend'den 'model_yili' olarak geliyor
      ithalat_durumu
    } = car_details || {};

    // Debug: Çıkarılan verileri logla
    console.log('=== EXTRACTED DATA ===');
    console.log('title:', title);
    console.log('price:', price);
    console.log('location_city:', location_city);
    console.log('product_id:', product_id);
    console.log('car_details:', car_details);
    console.log('selected_color_index:', selected_color_index);
    console.log('color_id:', color_id);
    console.log('images:', images);
    console.log('main_image:', main_image);
    console.log('brand:', brand);
    console.log('model:', model);
    console.log('km:', km);
    console.log('model_yili:', model_yili);

    // Gerekli alanları kontrol et (frontend'den gelen yapıya göre)
    if (!title || !price || !location_city || !product_id || !car_details) {
      console.log('=== MISSING BASIC FIELDS ===');
      return res.status(400).json({
        success: false,
        message: 'Temel alanlar eksik (title, price, location_city, product_id, car_details)'
      });
    }

    // car_details içindeki gerekli alanları kontrol et
    if (!brand || !model || !km || !model_yili) {
      console.log('=== MISSING CAR DETAILS ===');
      return res.status(400).json({
        success: false,
        message: 'Araç detayları eksik (brand, model, km, model_yili)'
      });
    }

    // Kullanıcı ID'sini kontrol et (frontend'den gelen veya token'dan)
    const final_user_id = user_id || req.user?.id;
    if (!final_user_id) {
      console.log('=== USER AUTH ERROR ===');
      console.log('req.user:', req.user);
      console.log('user_id from body:', user_id);
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    // Kilometre değerini sayıya çevir (string olarak gelebilir)
    const kmNumber = parseInt(km.toString().replace(/\D/g, ''), 10);
    
    // Model yılını sayıya çevir
    const modelYear = parseInt(model_yili, 10);

    // Product bilgilerini ve renklerini getir
    let selectedColorName = null;
    if (product_id && selected_color_index !== undefined && selected_color_index !== null) {
      try {
        const productResult = await db.query(`
          SELECT colors FROM cars_products WHERE id = $1
        `, [product_id]);
        
        if (productResult.rows.length > 0 && productResult.rows[0].colors) {
          const colors = typeof productResult.rows[0].colors === 'string' 
            ? JSON.parse(productResult.rows[0].colors) 
            : productResult.rows[0].colors;
          
          if (colors && colors[selected_color_index]) {
            selectedColorName = colors[selected_color_index].name;
            console.log('Selected color name from product:', selectedColorName);
          }
        }
      } catch (colorError) {
        console.error('Renk bilgisi alınırken hata:', colorError);
      }
    }

    console.log('=== PROCESSED VALUES ===');
    console.log('kmNumber:', kmNumber);
    console.log('modelYear:', modelYear);
    console.log('selectedColorName:', selectedColorName);
    console.log('Proceeding with database insert...');

    // Veritabanına kaydet - paket sistemi ile birlikte
    const result = await db.query(`
      INSERT INTO cars_listings (
        user_id, product_id, brand_id, category_id, brand_name, model_name,
        title, description, price, currency, location_city,
        km, model_year, engine_size, import_status, selected_color_name, selected_color_id,
        images, main_image, contact_phone, contact_email, contact_whatsapp, is_urgent,
        package_type, package_name, package_price, duration_days, has_serious_buyer_badge, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28, $29
      ) RETURNING *
    `, [
      final_user_id, 
      product_id, 
      brand_id,
      category_id,
      brand, // car_details.brand
      model, // car_details.model
      title, 
      description || '', 
      price, 
      currency, 
      location_city, // güncellenmiş alan adı
      kmNumber, // parse edilmiş km
      modelYear, // parse edilmiş model_yili
      engine_size || null, 
      ithalat_durumu || null,
      selectedColorName || null, // cars_products'tan alınan renk adı
      color_id || null, // Seçilen renk ID'si
      JSON.stringify(images), 
      main_image || null, 
      contact_phone || null, 
      contact_email || null, 
      contact_whatsapp || null, 
      is_urgent,
      package_type,
      package_name,
      package_price,
      duration_days,
      has_serious_buyer_badge,
      status
    ]);

    console.log('=== DATABASE INSERT SUCCESS ===');
    console.log('Created listing:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Araç ilanı başarıyla oluşturuldu',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('=== CREATE CAR LISTING ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Araç ilanı oluşturulamadı',
      error: error.message
    });
  }
};

// Araç ilanı detayını getir
const getCarListingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        cl.*,
        u.name as user_name,
        u.surname as user_surname,
        u.profile_image_url as user_profile_image,
        u.phone as user_phone,
        cp.colors as model_colors,
        cp.image_url as model_image_url
      FROM cars_listings cl
      LEFT JOIN users u ON cl.user_id = u.id
      LEFT JOIN cars_products cp ON cl.product_id = cp.id
      WHERE cl.id = $1 AND cl.is_active = true AND cl.status = 'approved'
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç ilanı bulunamadı'
      });
    }

    const listing = result.rows[0];
    
    // Parse model colors if available
    let modelColors = [];
    if (listing.model_colors) {
      try {
        modelColors = typeof listing.model_colors === 'string' 
          ? JSON.parse(listing.model_colors) 
          : listing.model_colors;
      } catch (parseError) {
        console.error('Model renkleri parse edilemedi:', parseError);
        modelColors = [];
      }
    }
    
    // Add parsed model colors to the response
    listing.model_colors = modelColors;

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Araç ilanı detayı getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araç ilanı detayı getirilemedi'
    });
  }
};

// Araba modeli oluştur
const createCarModel = async (req, res) => {
  try {
    const { 
      brand_id, 
      name, 
      model_year_start, 
      model_year_end, 
      body_type, 
      fuel_type, 
      transmission, 
      engine_size,
      colors,
      description
    } = req.body;
    
    let image_url = null;
    if (req.files && req.files['image']) {
      image_url = `/uploads/models/${req.files['image'][0].filename}`;
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
            processedColor.image = `/uploads/models/colors/${colorImageFile.filename}`;
          }
          
          processedColors.push(processedColor);
        }
      } catch (error) {
        console.error('Error processing colors:', error);
        processedColors = null;
      }
    }

    const result = await db.query(`
      INSERT INTO cars_products (
        brand_id, name, model_year_start, model_year_end, 
        body_type, fuel_type, transmission, engine_size,
        image_url, colors, description, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())
      RETURNING *
    `, [
      brand_id, name, model_year_start, model_year_end, 
      body_type, fuel_type, transmission, engine_size,
      image_url, processedColors ? JSON.stringify(processedColors) : null, description
    ]);

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

// Araba modeli güncelle
const updateCarModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      brand_id, 
      name, 
      model_year_start, 
      model_year_end, 
      body_type, 
      fuel_type, 
      transmission, 
      engine_size,
      colors,
      is_active,
      description
    } = req.body;

    // Mevcut modeli kontrol et
    const existingModel = await db.query('SELECT * FROM cars_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba modeli bulunamadı'
      });
    }

    let image_url = existingModel.rows[0].image_url;
    if (req.files && req.files['image']) {
      image_url = `/uploads/models/${req.files['image'][0].filename}`;
      
      // Eski resmi sil
      if (existingModel.rows[0].image_url) {
        const oldImagePath = path.join(__dirname, '..', existingModel.rows[0].image_url);
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
            processedColor.image = `/uploads/models/colors/${colorImageFile.filename}`;
          }
          
          processedColors.push(processedColor);
        }
      } catch (error) {
        console.error('Error processing colors:', error);
        processedColors = existingModel.rows[0].colors ? JSON.parse(existingModel.rows[0].colors) : null;
      }
    }

    const result = await db.query(`
      UPDATE cars_products 
      SET brand_id = $1, name = $2, model_year_start = $3, model_year_end = $4,
          body_type = $5, fuel_type = $6, transmission = $7, engine_size = $8,
          image_url = $9, colors = $10, is_active = $11, description = $12, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      brand_id, name, model_year_start, model_year_end, 
      body_type, fuel_type, transmission, engine_size,
      image_url, processedColors ? JSON.stringify(processedColors) : null, is_active, description || null, id
    ]);

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

// Araba modeli sil
const deleteCarModel = async (req, res) => {
  try {
    const { id } = req.params;

    // Mevcut modeli kontrol et
    const existingModel = await db.query('SELECT * FROM cars_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba modeli bulunamadı'
      });
    }

    // Modele ait ilanlar var mı kontrol et
    const listingsCount = await db.query('SELECT COUNT(*) FROM cars_listings WHERE product_id = $1', [id]);
    if (parseInt(listingsCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu modele ait ilanlar bulunduğu için silinemez'
      });
    }

    // Resmi sil
    if (existingModel.rows[0].image_url) {
      const imagePath = path.join(__dirname, '..', existingModel.rows[0].image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await db.query('DELETE FROM cars_products WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Araba modeli başarıyla silindi'
    });
  } catch (error) {
    console.error('Araba modeli silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Araba modeli silinemedi',
      error: error.message
    });
  }
};

// Araba modeli durumunu değiştir
const toggleCarModelStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Mevcut modeli kontrol et
    const existingModel = await db.query('SELECT * FROM cars_products WHERE id = $1', [id]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araba modeli bulunamadı'
      });
    }

    // Durumu tersine çevir
    const newStatus = !existingModel.rows[0].is_active;
    
    await db.query('UPDATE cars_products SET is_active = $1 WHERE id = $2', [newStatus, id]);

    res.json({
      success: true,
      message: `Model durumu ${newStatus ? 'aktif' : 'pasif'} olarak güncellendi`,
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

// ADMIN FUNCTIONS - MOVED TO adminController.js
// These functions have been moved to adminController.js for better organization
// and proper admin authentication/authorization

// ADMIN FUNCTIONS - MOVED TO adminController.js
// These functions have been moved to adminController.js for better organization
// and proper admin authentication/authorization

module.exports = {
  getCarBrands,
  getPopularCarBrands,
  getAllCarModels,
  getCarModelsByBrand,
  getEnginesByModel,
  getCarModelDetails,
  getCarListings,
  createCarListing,
  getCarListingDetail,
  searchCars,
  getBodyTypes,
  getFuelTypes,
  getTransmissionTypes,
  getCarProductColors,
  createCarModel,
  updateCarModel,
  deleteCarModel,
  toggleCarModelStatus
};