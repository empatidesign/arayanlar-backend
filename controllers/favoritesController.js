const db = require('../services/database');

// Kullanıcının favorilerini getir
const getUserFavorites = async (req, res) => {
  console.log('getUserFavorites çağrıldı, user ID:', req.user?.id);
  try {
    const userId = req.user.id;
    const { type } = req.query; // Opsiyonel: belirli bir tip için filtreleme

    let query;
    let params = [userId];

    if (type && ['watch', 'housing', 'cars'].includes(type)) {
      // Belirli bir tip için favoriler
      if (type === 'watch') {
        query = `
          SELECT 
            f.id as favorite_id,
            f.created_at as favorited_at,
            f.listing_type,
            l.id,
            l.user_id,
            l.title,
            l.description,
            l.price,
            l.currency,
            l.images,
            l.main_image,
            l.is_urgent,
            l.is_active,
            l.view_count,
            l.contact_phone,
            l.contact_email,
            l.contact_whatsapp,
            l.created_at,
            l.updated_at,
            l.expires_at,
            l.status,
            l.rejection_reason,
            l.package_type,
            l.package_name,
            l.package_price,
            l.duration_days,
            l.has_serious_buyer_badge,
            l.location_city,
            l.location_district,
            CAST(l.category_data AS TEXT) as category_name
          FROM favorites f
          JOIN watch_listings l ON f.watch_listing_id = l.id
          WHERE f.user_id = $1 AND f.listing_type = 'watch'
          ORDER BY f.created_at DESC
        `;
      } else if (type === 'housing') {
        query = `
          SELECT 
            f.id as favorite_id,
            f.created_at as favorited_at,
            f.listing_type,
            l.id,
            l.user_id,
            l.title,
            l.description,
            l.price,
            l.currency,
            l.images,
            l.main_image,
            l.is_urgent,
            l.is_active,
            l.view_count,
            l.contact_phone,
            l.contact_email,
            l.contact_whatsapp,
            l.created_at,
            l.updated_at,
            l.expires_at,
            l.status,
            l.rejection_reason,
            l.package_type,
            l.package_name,
            l.package_price,
            l.duration_days,
            l.has_serious_buyer_badge,
            l.province as location_city,
            l.district as location_district,
            l.property_type as category_name
          FROM favorites f
          JOIN housing_listings l ON f.housing_listing_id = l.id
          WHERE f.user_id = $1 AND f.listing_type = 'housing'
          ORDER BY f.created_at DESC
        `;
      } else if (type === 'cars') {
        query = `
          SELECT 
            f.id as favorite_id,
            f.created_at as favorited_at,
            f.listing_type,
            l.id,
            l.user_id,
            l.title,
            l.description,
            l.price,
            l.currency,
            l.images,
            l.main_image,
            l.is_urgent,
            l.is_active,
            l.view_count,
            l.contact_phone,
            l.contact_email,
            l.contact_whatsapp,
            l.created_at,
            l.updated_at,
            l.expires_at,
            l.status,
            l.rejection_reason,
            l.package_type,
            l.package_name,
            l.package_price,
            l.duration_days,
            l.has_serious_buyer_badge,
            l.location_city,
            NULL as location_district,
            l.brand_name as category_name
          FROM favorites f
          JOIN cars_listings l ON f.cars_listing_id = l.id
          WHERE f.user_id = $1 AND f.listing_type = 'cars'
          ORDER BY f.created_at DESC
        `;
      }
    } else {
      // Tüm favoriler (UNION ile birleştir) - Ortak sütunları seç
      query = `
        SELECT 
          f.id as favorite_id,
          f.created_at as favorited_at,
          f.listing_type,
          l.id,
          l.user_id,
          l.title,
          l.description,
          l.price,
          l.currency,
          l.images,
          l.main_image,
          l.is_urgent,
          l.is_active,
          l.view_count,
          l.contact_phone,
          l.contact_email,
          l.contact_whatsapp,
          l.created_at,
          l.updated_at,
          l.expires_at,
          l.status,
          l.rejection_reason,
          l.package_type,
          l.package_name,
          l.package_price,
          l.duration_days,
          l.has_serious_buyer_badge,
          l.location_city as location_city,
          l.location_district as location_district,
          CAST(l.category_data AS TEXT) as category_name
        FROM favorites f
        JOIN watch_listings l ON f.watch_listing_id = l.id
        WHERE f.user_id = $1 AND f.listing_type = 'watch'
        
        UNION ALL
        
        SELECT 
          f.id as favorite_id,
          f.created_at as favorited_at,
          f.listing_type,
          l.id,
          l.user_id,
          l.title,
          l.description,
          l.price,
          l.currency,
          l.images,
          l.main_image,
          l.is_urgent,
          l.is_active,
          l.view_count,
          l.contact_phone,
          l.contact_email,
          l.contact_whatsapp,
          l.created_at,
          l.updated_at,
          l.expires_at,
          l.status,
          l.rejection_reason,
          l.package_type,
          l.package_name,
          l.package_price,
          l.duration_days,
          l.has_serious_buyer_badge,
          l.province as location_city,
          l.district as location_district,
          l.property_type as category_name
        FROM favorites f
        JOIN housing_listings l ON f.housing_listing_id = l.id
        WHERE f.user_id = $2 AND f.listing_type = 'housing'
        
        UNION ALL
        
        SELECT 
          f.id as favorite_id,
          f.created_at as favorited_at,
          f.listing_type,
          l.id,
          l.user_id,
          l.title,
          l.description,
          l.price,
          l.currency,
          l.images,
          l.main_image,
          l.is_urgent,
          l.is_active,
          l.view_count,
          l.contact_phone,
          l.contact_email,
          l.contact_whatsapp,
          l.created_at,
          l.updated_at,
          l.expires_at,
          l.status,
          l.rejection_reason,
          l.package_type,
          l.package_name,
          l.package_price,
          l.duration_days,
          l.has_serious_buyer_badge,
          l.location_city as location_city,
          NULL as location_district,
          l.brand_name as category_name
        FROM favorites f
        JOIN cars_listings l ON f.cars_listing_id = l.id
        WHERE f.user_id = $3 AND f.listing_type = 'cars'
        
        ORDER BY favorited_at DESC
      `;
      params = [userId, userId, userId]; // Her UNION için ayrı parametre
    }

    const result = await db.query(query, params);
    console.log('Favoriler sorgusu sonucu:', result.rows.length, 'adet');

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Favoriler getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Favoriler getirilirken hata oluştu'
    });
  }
};

// Favori ekle
const addFavorite = async (req, res) => {
  console.log('addFavorite çağrıldı, user ID:', req.user?.id);
  console.log('Request body:', req.body);
  
  try {
    const userId = req.user.id;
    const { listing_id, listing_type } = req.body;

    console.log('Eklenmek istenen listing ID:', listing_id, 'Type:', listing_type);

    if (!listing_id || !listing_type) {
      console.log('Listing ID veya type eksik');
      return res.status(400).json({
        success: false,
        message: 'İlan ID ve tip gerekli'
      });
    }

    if (!['watch', 'housing', 'cars'].includes(listing_type)) {
      console.log('Geçersiz listing type:', listing_type);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz ilan tipi'
      });
    }

    // İlan var mı kontrol et
    let listingCheck;
    let tableName;
    let listingIdColumn;

    if (listing_type === 'watch') {
      tableName = 'watch_listings';
      listingIdColumn = 'watch_listing_id';
    } else if (listing_type === 'housing') {
      tableName = 'housing_listings';
      listingIdColumn = 'housing_listing_id';
    } else if (listing_type === 'cars') {
      tableName = 'cars_listings';
      listingIdColumn = 'cars_listing_id';
    }

    listingCheck = await db.query(
      `SELECT id FROM ${tableName} WHERE id = $1`,
      [listing_id]
    );

    console.log('İlan kontrolü sonucu:', listingCheck.rows.length);

    if (listingCheck.rows.length === 0) {
      console.log('İlan bulunamadı');
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    // Zaten favorilerde var mı kontrol et
    const existingFavorite = await db.query(
      `SELECT id FROM favorites WHERE user_id = $1 AND ${listingIdColumn} = $2 AND listing_type = $3`,
      [userId, listing_id, listing_type]
    );

    console.log('Mevcut favori kontrolü:', existingFavorite.rows.length);

    if (existingFavorite.rows.length > 0) {
      console.log('Bu ilan zaten favorilerde');
      return res.status(400).json({
        success: false,
        message: 'Bu ilan zaten favorilerinizde'
      });
    }

    // Favori ekle
    let query;
    let params;

    if (listing_type === 'watch') {
      query = `
        INSERT INTO favorites (user_id, watch_listing_id, listing_type)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      params = [userId, listing_id, listing_type];
    } else if (listing_type === 'housing') {
      query = `
        INSERT INTO favorites (user_id, housing_listing_id, listing_type)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      params = [userId, listing_id, listing_type];
    } else if (listing_type === 'cars') {
      query = `
        INSERT INTO favorites (user_id, cars_listing_id, listing_type)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      params = [userId, listing_id, listing_type];
    }

    const result = await db.query(query, params);
    console.log('Favori ekleme sonucu:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'İlan favorilere eklendi',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Favori ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Favori eklenirken hata oluştu'
    });
  }
};

// Favori kaldır
const removeFavorite = async (req, res) => {
  console.log('removeFavorite çağrıldı, user ID:', req.user?.id);
  console.log('Request params:', req.params);
  console.log('Request query:', req.query);
  
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      console.log('User ID eksik - authentication hatası');
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }
    
    const { listing_id } = req.params;
    const { listing_type } = req.query; // req.body yerine req.query kullan

    console.log('Kaldırılmak istenen listing ID:', listing_id, 'Type:', listing_type);

    if (!listing_id || isNaN(parseInt(listing_id)) || !listing_type) {
      console.log('Listing ID veya type eksik/geçersiz');
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ilan ID ve tip gerekli'
      });
    }

    if (!['watch', 'housing', 'cars'].includes(listing_type)) {
      console.log('Geçersiz listing type:', listing_type);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz ilan tipi'
      });
    }

    // Listing ID column belirle
    let listingIdColumn;
    if (listing_type === 'watch') {
      listingIdColumn = 'watch_listing_id';
    } else if (listing_type === 'housing') {
      listingIdColumn = 'housing_listing_id';
    } else if (listing_type === 'cars') {
      listingIdColumn = 'cars_listing_id';
    }

    // Favori var mı kontrol et
    const existingFavorite = await db.query(
      `SELECT id FROM favorites WHERE user_id = $1 AND ${listingIdColumn} = $2 AND listing_type = $3`,
      [parseInt(userId), parseInt(listing_id), listing_type]
    );

    console.log('Mevcut favori kontrolü:', existingFavorite.rows.length);

    if (existingFavorite.rows.length === 0) {
      console.log('Bu ilan favorilerde değil');
      return res.status(404).json({
        success: false,
        message: 'Bu ilan favorilerinizde değil'
      });
    }

    // Favoriyi kaldır
    const query = `
      DELETE FROM favorites 
      WHERE user_id = $1 AND ${listingIdColumn} = $2 AND listing_type = $3
      RETURNING *
    `;

    const result = await db.query(query, [parseInt(userId), parseInt(listing_id), listing_type]);
    console.log('Favori kaldırma sonucu:', result.rows[0]);

    res.json({
      success: true,
      message: 'İlan favorilerden kaldırıldı',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Favori kaldırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Favori kaldırılırken hata oluştu'
    });
  }
};

// Favori durumunu kontrol et
const checkFavoriteStatus = async (req, res) => {
  console.log('checkFavoriteStatus çağrıldı, user ID:', req.user?.id);
  console.log('Request params:', req.params);
  console.log('Request query:', req.query);
  
  try {
    const userId = req.user.id;
    const { listing_id } = req.params;
    const { listing_type } = req.query;

    console.log('Kontrol edilmek istenen listing ID:', listing_id, 'Type:', listing_type);

    if (!listing_id || !listing_type) {
      console.log('Listing ID veya type eksik');
      return res.status(400).json({
        success: false,
        message: 'İlan ID ve tip gerekli'
      });
    }

    if (!['watch', 'housing', 'cars'].includes(listing_type)) {
      console.log('Geçersiz listing type:', listing_type);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz ilan tipi'
      });
    }

    // Listing ID column belirle
    let listingIdColumn;
    if (listing_type === 'watch') {
      listingIdColumn = 'watch_listing_id';
    } else if (listing_type === 'housing') {
      listingIdColumn = 'housing_listing_id';
    } else if (listing_type === 'cars') {
      listingIdColumn = 'cars_listing_id';
    }

    // Favori durumunu kontrol et
    const query = `
      SELECT id FROM favorites 
      WHERE user_id = $1 AND ${listingIdColumn} = $2 AND listing_type = $3
    `;

    const result = await db.query(query, [userId, listing_id, listing_type]);
    const isFavorite = result.rows.length > 0;

    console.log('Favori durumu kontrolü sonucu:', isFavorite);

    res.json({
      success: true,
      data: { isFavorite }
    });

  } catch (error) {
    console.error('Favori durumu kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Favori durumu kontrol edilirken hata oluştu'
    });
  }
};

module.exports = {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  checkFavoriteStatus
};