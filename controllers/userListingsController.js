const db = require('../services/database');

// Kullanıcının tüm ilanlarını getir (watch, car, housing)
const getUserListings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Watch ilanlarını getir
    const watchQuery = `
      SELECT 
        wl.id,
        wl.title,
        wl.description,
        wl.price,
        wl.currency,
        wl.location_city,
        wl.location_district,
        wl.main_image,
        wl.images,
        wl.status,
        wl.created_at,
        wl.updated_at,
        'watch' as listing_type,
        wb.name as brand_name,
        wp.name as product_name
      FROM watch_listings wl
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      LEFT JOIN watch_products wp ON wl.product_id = wp.id
      WHERE wl.user_id = $1
    `;

    // Car ilanlarını getir
    const carQuery = `
      SELECT 
        cl.id,
        cl.title,
        cl.description,
        cl.price,
        cl.currency,
        cl.location_city,
        NULL as location_district,
        cl.main_image,
        cl.images,
        cl.status,
        cl.created_at,
        cl.updated_at,
        'car' as listing_type,
        cb.name as brand_name,
        cp.name as product_name
      FROM cars_listings cl
      LEFT JOIN cars_brands cb ON cl.brand_id = cb.id
      LEFT JOIN cars_products cp ON cl.product_id = cp.id
      WHERE cl.user_id = $1
    `;

    // Housing ilanlarını getir
    const housingQuery = `
      SELECT 
        hl.id,
        hl.title,
        hl.description,
        hl.price,
        hl.currency,
        hl.province as location_city,
        hl.district as location_district,
        hl.main_image,
        hl.images,
        hl.status,
        hl.created_at,
        hl.updated_at,
        'housing' as listing_type,
        hl.property_type as brand_name,
        hl.room_count as product_name
      FROM housing_listings hl
      WHERE hl.user_id = $1
    `;

    // Tüm ilanları birleştir ve sırala
    const combinedQuery = `
      (${watchQuery})
      UNION ALL
      (${carQuery})
      UNION ALL
      (${housingQuery})
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(combinedQuery, [userId, limit, offset]);

    // Toplam ilan sayısını getir
    const countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM watch_listings WHERE user_id = $1) +
        (SELECT COUNT(*) FROM cars_listings WHERE user_id = $1) +
        (SELECT COUNT(*) FROM housing_listings WHERE user_id = $1) as total_count
    `;

    const countResult = await db.query(countQuery, [userId]);
    const totalCount = parseInt(countResult.rows[0].total_count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Kullanıcı ilanları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlanlar getirilemedi',
      error: error.message
    });
  }
};

// Kullanıcının belirli tip ilanlarını getir
const getUserListingsByType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query;
    let countQuery;

    switch (type) {
      case 'watch':
        query = `
          SELECT 
            wl.*,
            wb.name as brand_name,
            wp.name as product_name,
            'watch' as listing_type
          FROM watch_listings wl
          LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
          LEFT JOIN watch_products wp ON wl.product_id = wp.id
          WHERE wl.user_id = $1
          ORDER BY wl.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        countQuery = `SELECT COUNT(*) FROM watch_listings WHERE user_id = $1`;
        break;

      case 'car':
        query = `
          SELECT 
            cl.*,
            cb.name as brand_name,
            cp.name as product_name,
            'car' as listing_type
          FROM cars_listings cl
          LEFT JOIN cars_brands cb ON cl.brand_id = cb.id
          LEFT JOIN cars_products cp ON cl.product_id = cp.id
          WHERE cl.user_id = $1
          ORDER BY cl.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        countQuery = `SELECT COUNT(*) FROM cars_listings WHERE user_id = $1`;
        break;

      case 'housing':
        query = `
          SELECT 
            hl.*,
            'housing' as listing_type
          FROM housing_listings hl
          WHERE hl.user_id = $1
          ORDER BY hl.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        countQuery = `SELECT COUNT(*) FROM housing_listings WHERE user_id = $1`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Geçersiz ilan tipi. Geçerli tipler: watch, car, housing'
        });
    }

    const result = await db.query(query, [userId, limit, offset]);
    const countResult = await db.query(countQuery, [userId]);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Kullanıcı ilanları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlanlar getirilemedi',
      error: error.message
    });
  }
};

module.exports = {
  getUserListings,
  getUserListingsByType
};