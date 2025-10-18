const db = require('../services/database');

// Konut ilanı oluştur
const createHousingListing = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      price,
      province,
      district,
      property_type, // 'Daire', 'Villa', etc.
      room_count,
      gross_area,
      floor_number,
      building_age,
      is_in_site,
      site_name,
      heating_type,
      is_furnished,
      listing_type, // 'satilik' veya 'kiralik'
      main_image, // İlçe resmi
      package_type,
      package_price,
      duration_days,
      has_serious_buyer_badge
    } = req.body;

    // building_age değerini direkt string olarak sakla
    const buildingAgeValue = building_age || null;

    // Zorunlu alanları kontrol et
    if (!title || !price || !property_type || !room_count || !gross_area) {
      return res.status(400).json({
        success: false,
        message: 'Başlık, fiyat, emlak tipi, oda sayısı ve metrekare alanları zorunludur'
      });
    }

    const query = `
      INSERT INTO housing_listings (
        user_id, title, description, price,
        province, district, property_type, room_count,
        gross_area, floor_number, building_age, is_in_site, site_name,
        heating_type, is_furnished, listing_type, main_image, package_type, package_price,
        duration_days, has_serious_buyer_badge, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22
      ) RETURNING *
    `;

    const values = [
      userId, title, description, price,
      province || 'İstanbul', district, property_type, room_count,
      gross_area, floor_number, buildingAgeValue, is_in_site, site_name,
      heating_type, is_furnished, listing_type || 'satilik', main_image, package_type || 'free', package_price || 0,
      duration_days || 30, has_serious_buyer_badge || false, 'pending'
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Konut ilanı başarıyla oluşturuldu',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Konut ilanı oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı oluşturulamadı',
      error: error.message
    });
  }
};

// Konut ilanlarını getir (Admin için)
const getAllHousingListingsForAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      status,
      property_type,
      province,
      district
    } = req.query;
    
    // Sayfalama hesaplamaları
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        hl.*,
        u.name as user_name,
        u.surname as user_surname,
        u.email as user_email,
        u.phone as user_phone,
        u.profile_image_url as user_profile_image,
        d.image as district_image
      FROM housing_listings hl
      LEFT JOIN users u ON hl.user_id = u.id
      LEFT JOIN districts d ON LOWER(d.name) = LOWER(hl.district) AND d.is_active = true
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Durum filtresi
    if (status && status !== 'all') {
      query += ` AND hl.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }
    
    // Emlak tipi filtresi
    if (property_type) {
      query += ` AND hl.property_type = $${queryParams.length + 1}`;
      queryParams.push(property_type);
    }
    
    // İl filtresi
    if (province) {
      query += ` AND LOWER(hl.province) LIKE LOWER($${queryParams.length + 1})`;
      queryParams.push(`%${province}%`);
    }
    
    // İlçe filtresi
    if (district) {
      query += ` AND LOWER(hl.district) LIKE LOWER($${queryParams.length + 1})`;
      queryParams.push(`%${district}%`);
    }
    
    // Sıralama ve sayfalama
    query += ` ORDER BY hl.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit));
    queryParams.push(offset);
    
    const result = await db.query(query, queryParams);
    
    // Toplam sayıyı al
    let countQuery = `
      SELECT COUNT(*) as count
      FROM housing_listings hl
      LEFT JOIN users u ON hl.user_id = u.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (status && status !== 'all') {
      countQuery += ` AND hl.status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    
    if (property_type) {
      countQuery += ` AND hl.property_type = $${countParams.length + 1}`;
      countParams.push(property_type);
    }
    
    if (province) {
      countQuery += ` AND LOWER(hl.province) LIKE LOWER($${countParams.length + 1})`;
      countParams.push(`%${province}%`);
    }
    
    if (district) {
      countQuery += ` AND LOWER(hl.district) LIKE LOWER($${countParams.length + 1})`;
      countParams.push(`%${district}%`);
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
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin konut ilanları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanları getirilemedi',
      error: error.message
    });
  }
};

// Konut ilanlarını getir (Genel kullanım için)
const getHousingListings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      district, 
      property_type,
      min_price,
      max_price,
      room_count
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ["hl.status = 'approved'", "hl.created_at > NOW() - INTERVAL '7 days'"];
    let queryParams = [];
    let paramIndex = 1;

    if (district) {
      whereConditions.push(`hl.district ILIKE $${paramIndex}`);
      queryParams.push(`%${district}%`);
      paramIndex++;
    }

    if (property_type) {
      whereConditions.push(`hl.property_type = $${paramIndex}`);
      queryParams.push(property_type);
      paramIndex++;
    }



    if (min_price) {
      whereConditions.push(`hl.price >= $${paramIndex}`);
      queryParams.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      whereConditions.push(`hl.price <= $${paramIndex}`);
      queryParams.push(max_price);
      paramIndex++;
    }

    if (room_count) {
      whereConditions.push(`hl.room_count = $${paramIndex}`);
      queryParams.push(room_count);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT hl.*, u.name as user_name, u.phone as user_phone,
             d.image as district_image
      FROM housing_listings hl
      LEFT JOIN users u ON hl.user_id = u.id
      LEFT JOIN districts d ON LOWER(d.name) = LOWER(hl.district) AND d.is_active = true
      ${whereClause}
      ORDER BY hl.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Toplam sayıyı al
    const countQueryParams = queryParams.slice(0, -2); // limit ve offset'i çıkar
    const countQuery = `
      SELECT COUNT(*) as total
      FROM housing_listings hl
      LEFT JOIN users u ON hl.user_id = u.id
      LEFT JOIN districts d ON LOWER(d.name) = LOWER(hl.district) AND d.is_active = true
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, countQueryParams);
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
    console.error('Konut ilanları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanları getirilemedi',
      error: error.message
    });
  }
};

// Konut ilanı detayını getir
const getHousingListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT hl.*, u.name as user_name, u.surname as user_surname, u.phone as user_phone, u.email as user_email, u.profile_image_url,
             d.image as district_image
      FROM housing_listings hl
      LEFT JOIN users u ON hl.user_id = u.id
      LEFT JOIN districts d ON LOWER(d.name) = LOWER(hl.district) AND d.is_active = true
      WHERE hl.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konut ilanı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Konut ilanı getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı getirilemedi',
      error: error.message
    });
  }
};

// Konut ilanını güncelle
const updateHousingListing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // İlanın sahibi olup olmadığını kontrol et
    const ownerCheck = await db.query(
      'SELECT user_id FROM housing_listings WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu ilanı güncelleme yetkiniz yok'
      });
    }

    // Güncelleme sorgusu oluştur
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'id' && key !== 'user_id') {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updateData[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE housing_listings 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    res.json({
      success: true,
      message: 'Konut ilanı başarıyla güncellendi',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Konut ilanı güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı güncellenemedi',
      error: error.message
    });
  }
};

// Konut ilanını sil
const deleteHousingListing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // İlanın sahibi olup olmadığını kontrol et
    const ownerCheck = await db.query(
      'SELECT user_id FROM housing_listings WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu ilanı silme yetkiniz yok'
      });
    }

    await db.query('DELETE FROM housing_listings WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Konut ilanı başarıyla silindi'
    });

  } catch (error) {
    console.error('Konut ilanı silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı silinemedi',
      error: error.message
    });
  }
};

// Bekleyen konut ilanlarını getir (Admin)
const getPendingHousingListings = async (req, res) => {
  try {
    const query = `
      SELECT hl.*, u.name as user_name, u.email as user_email,
             d.image as district_image
      FROM housing_listings hl
      LEFT JOIN users u ON hl.user_id = u.id
      LEFT JOIN districts d ON LOWER(d.name) = LOWER(hl.district) AND d.is_active = true
      WHERE hl.status = 'pending'
      ORDER BY hl.created_at DESC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Bekleyen konut ilanları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen konut ilanları getirilemedi',
      error: error.message
    });
  }
};

// Konut ilanını onayla (Admin)
const approveHousingListing = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE housing_listings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['approved', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Konut ilanı başarıyla onaylandı',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Konut ilanı onaylanırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı onaylanamadı',
      error: error.message
    });
  }
};

// Konut ilanını reddet (Admin)
const rejectHousingListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const result = await db.query(
      'UPDATE housing_listings SET status = $1, rejection_reason = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      ['rejected', rejection_reason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Konut ilanı başarıyla reddedildi',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Konut ilanı reddedilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı reddedilemedi',
      error: error.message
    });
  }
};

// Onaylanan konut ilanını iptal et (Admin)
const cancelHousingListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    // Önce ilanın onaylı olup olmadığını kontrol et
    const checkResult = await db.query(
      'SELECT status FROM housing_listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    if (checkResult.rows[0].status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Sadece onaylanan ilanlar iptal edilebilir'
      });
    }

    const result = await db.query(
      'UPDATE housing_listings SET status = $1, rejection_reason = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      ['cancelled', cancellation_reason, id]
    );

    res.json({
      success: true,
      message: 'Konut ilanı başarıyla iptal edildi',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Konut ilanı iptal edilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı iptal edilemedi',
      error: error.message
    });
  }
};

// İptal edilen konut ilanını tekrar onayla (Admin)
const reapproveHousingListing = async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın var olup olmadığını kontrol et
    const checkResult = await db.query(
      'SELECT id, status FROM housing_listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    if (checkResult.rows[0].status !== 'cancelled' && checkResult.rows[0].status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Sadece iptal edilmiş veya reddedilmiş ilanlar tekrar onaylanabilir'
      });
    }

    const result = await db.query(
      'UPDATE housing_listings SET status = $1, rejection_reason = NULL, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['approved', id]
    );

    res.json({
      success: true,
      message: 'Konut ilanı başarıyla tekrar onaylandı',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Konut ilanı tekrar onaylanırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı tekrar onaylanamadı',
      error: error.message
    });
  }
};

// Admin için ilan silme fonksiyonu
const deleteHousingListingByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın var olup olmadığını kontrol et
    const checkResult = await db.query(
      'SELECT id, title, user_id FROM housing_listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    // İlanı sil
    await db.query('DELETE FROM housing_listings WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Konut ilanı başarıyla silindi'
    });

  } catch (error) {
    console.error('Konut ilanı silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı silinemedi',
      error: error.message
    });
  }
};

module.exports = {
  createHousingListing,
  getHousingListings,
  getAllHousingListingsForAdmin,
  getHousingListingById,
  updateHousingListing,
  deleteHousingListing,
  deleteHousingListingByAdmin,
  approveHousingListing,
  rejectHousingListing,
  cancelHousingListing,
  reapproveHousingListing,
  getPendingHousingListings
};