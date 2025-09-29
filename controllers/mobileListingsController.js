const db = require('../services/database');

// Mobile app için sadece onaylanmış ilanları döndüren endpoint
const getMobileListings = async (req, res) => {
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
    
    // Mobile için sadece aktif ve onaylanmış ilanları göster
    let whereConditions = ['l.is_active = true', 'l.status = \'approved\''];
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
    console.error('Mobile ilanları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlanlar getirilirken hata oluştu'
    });
  }
};

// Mobile app için tek ilan detayı - sadece onaylanmış
const getMobileListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        l.*,
        s.name as category_name,
        u.name as user_name,
        u.surname as user_surname,
        u.phone as user_phone,
        u.profile_image_url as user_avatar
      FROM listings l
      JOIN sections s ON l.category_id = s.id
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1 AND l.is_active = true AND l.status = 'approved'
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
    console.error('Mobile ilan detayı getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan detayı getirilirken hata oluştu'
    });
  }
};

// Mobile app için ilan oluşturma - normal createListing'i kullan
const { createListing } = require('./listingsController');

module.exports = {
  getMobileListings,
  getMobileListingById,
  createMobileListing: createListing
};