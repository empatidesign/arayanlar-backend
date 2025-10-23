const db = require('../../services/database');

// Admin role kontrolü
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Bu işlem için admin yetkisi gereklidir'
    });
  }
};

// Admin için tüm konut ilanlarını getir
const getAllHousingListingsForAdmin = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

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

// Bekleyen konut ilanlarını getir (Admin)
const getPendingHousingListings = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

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
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const { id } = req.params;

    const result = await db.query(
      'UPDATE housing_listings SET status = $1, expires_at = NOW() + INTERVAL \'7 days\', updated_at = NOW() WHERE id = $2 RETURNING *',
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
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

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

// Konut ilanını iptal et (Admin)
const cancelHousingListing = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

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
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

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
      'UPDATE housing_listings SET status = $1, expires_at = NOW() + INTERVAL \'7 days\', rejection_reason = NULL, updated_at = NOW() WHERE id = $2 RETURNING *',
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
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

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

// Admin için konut ilanını ID ile getir
const getHousingListingById = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

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

// Admin için konut ilanını güncelle
const updateHousingListing = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // İlanın varlığını kontrol et
    const existCheck = await db.query(
      'SELECT id FROM housing_listings WHERE id = $1',
      [id]
    );

    if (existCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
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

// Admin için konut ilanı süre uzatma fonksiyonu
const extendHousingListingDuration = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const { id } = req.params;

    // İlanın var olup olmadığını ve durumunu kontrol et
    const checkResult = await db.query(
      'SELECT id, title, status, expires_at FROM housing_listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
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
      'UPDATE housing_listings SET expires_at = NOW() + INTERVAL \'7 days\', status = \'approved\', updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({
      success: true,
      message: 'Konut ilanının süresi başarıyla uzatıldı',
      data: {
        id: result.rows[0].id,
        title: result.rows[0].title,
        status: result.rows[0].status,
        expires_at: result.rows[0].expires_at,
        newExpiryDate: result.rows[0].expires_at
      }
    });

  } catch (error) {
    console.error('Konut ilanı süresi uzatılırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Konut ilanı süresi uzatılamadı',
      error: error.message
    });
  }
};

module.exports = {
  requireAdmin,
  getAllHousingListingsForAdmin,
  getPendingHousingListings,
  approveHousingListing,
  rejectHousingListing,
  cancelHousingListing,
  reapproveHousingListing,
  deleteHousingListingByAdmin,
  getHousingListingById,
  updateHousingListing,
  extendHousingListingDuration
};