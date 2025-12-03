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
      property_type, // 'Daire', 'Villa', 'DÜKKAN', 'OFİS', etc.
      commercial_type, // Ticari ilan tipi (DÜKKAN, OFİS, FABRİKA, DEPO, ATÖLYE, İMALATHANE)
      room_count,
      gross_area,
      max_area, // Maksimum metrekare
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
      has_serious_buyer_badge,
      is_commercial // Ticari ilan mı?
    } = req.body;

    // building_age değerini direkt string olarak sakla
    const buildingAgeValue = building_age || null;

    // Zorunlu alanları kontrol et
    // Ticari ilanlar için room_count zorunlu değil
    if (!title || !price || !property_type || !gross_area) {
      return res.status(400).json({
        success: false,
        message: 'Başlık, fiyat, emlak tipi ve metrekare alanları zorunludur'
      });
    }

    // Fiyat kontrolü - 1 trilyonun altında olmalı
    if (price >= 1000000000000) {
      return res.status(400).json({
        success: false,
        message: 'Fiyat 1 trilyonun altında olmalıdır'
      });
    }
    
    // Konut ilanları için room_count zorunlu
    if (!is_commercial && !room_count) {
      return res.status(400).json({
        success: false,
        message: 'Konut ilanları için oda sayısı zorunludur'
      });
    }

    const query = `
      INSERT INTO housing_listings (
        user_id, title, description, price,
        province, district, property_type, commercial_type, room_count,
        gross_area, max_area, floor_number, building_age, is_in_site, site_name,
        heating_type, is_furnished, listing_type, main_image, package_type, package_price,
        duration_days, has_serious_buyer_badge, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24
      ) RETURNING *
    `;

    const values = [
      userId, title, description, price,
      province || 'İstanbul', district, property_type, commercial_type || null, room_count || null,
      gross_area, max_area || null, floor_number, buildingAgeValue, is_in_site, site_name,
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

// Admin için tüm konut ilanlarını getir - TAŞINDI: adminHouseController.js
// const getAllHousingListingsForAdmin = async (req, res) => { ... }

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
      room_count,
      is_commercial
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ["hl.status = 'approved'", "hl.expires_at > NOW()"];
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

    // Ticari/Konut filtresi
    if (is_commercial === 'true') {
      // Ticari ilanlar: commercial_type dolu olanlar
      whereConditions.push(`hl.commercial_type IS NOT NULL`);
    } else if (is_commercial === 'false') {
      // Konut ilanları: commercial_type boş olanlar
      whereConditions.push(`hl.commercial_type IS NULL`);
    }

    // Soft delete kontrolü ekle
    whereConditions.push(`hl.deleted_at IS NULL`);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT hl.*, u.name as user_name, u.phone as user_phone,
             u.profile_image_url as user_profile_image,
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

// Konut ilanı detayını getir (Normal kullanıcılar için)
const getHousingListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT hl.*, u.name as user_name, u.surname as user_surname, u.phone as user_phone, u.email as user_email, u.profile_image_url,
             d.image as district_image
      FROM housing_listings hl
      LEFT JOIN users u ON hl.user_id = u.id
      LEFT JOIN districts d ON LOWER(d.name) = LOWER(hl.district) AND d.is_active = true
      WHERE hl.id = $1 AND hl.status = 'approved' AND hl.deleted_at IS NULL
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
// Bu fonksiyon adminHouseController.js'e taşındı
// const updateHousingListing = async (req, res) => {
//   // Kod adminHouseController.js'e taşındı
// };

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

    // Tip dönüşümü ile karşılaştır
    if (parseInt(ownerCheck.rows[0].user_id) !== parseInt(userId)) {
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

// Bekleyen konut ilanlarını getir (Admin) - TAŞINDI: adminHouseController.js
// const getPendingHousingListings = async (req, res) => {
// Konut ilanını onayla (Admin) - TAŞINDI: adminHouseController.js  
// const approveHousingListing = async (req, res) => {
// Konut ilanını reddet (Admin) - TAŞINDI: adminHouseController.js
// const rejectHousingListing = async (req, res) => {
// Konut ilanını iptal et (Admin) - TAŞINDI: adminHouseController.js
// const cancelHousingListing = async (req, res) => {
// İptal edilen konut ilanını tekrar onayla (Admin) - TAŞINDI: adminHouseController.js
// const reapproveHousingListing = async (req, res) => {
// Admin için ilan silme fonksiyonu - TAŞINDI: adminHouseController.js
// const deleteHousingListingByAdmin = async (req, res) => {
module.exports = {
  createHousingListing,
  getHousingListings,
  getHousingListingById,
  deleteHousingListing
};