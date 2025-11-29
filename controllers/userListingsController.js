const db = require('../services/database');

// Kullanıcının tüm ilanlarını getir (watch, car, housing)
const getUserListings = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('getUserListings çağrıldı - userId:', userId, 'type:', typeof userId);
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
        CASE 
          WHEN wl.status = 'approved' AND wl.created_at <= NOW() - INTERVAL '7 days' THEN 'expired'
          ELSE wl.status
        END as status,
        wl.rejection_reason,
        wl.created_at,
        wl.updated_at,
        'watch' as listing_type,
        wb.name as brand_name,
        wp.name as product_name
      FROM watch_listings wl
      LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
      LEFT JOIN watch_products wp ON wl.product_id = wp.id
      WHERE wl.user_id = $1 AND wl.deleted_at IS NULL
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
        CASE 
          WHEN cl.status = 'approved' AND cl.created_at <= NOW() - INTERVAL '7 days' THEN 'expired'
          ELSE cl.status
        END as status,
        cl.rejection_reason,
        cl.created_at,
        cl.updated_at,
        'car' as listing_type,
        cb.name as brand_name,
        cp.name as product_name
      FROM cars_listings cl
      LEFT JOIN cars_brands cb ON cl.brand_id = cb.id
      LEFT JOIN cars_products cp ON cl.product_id = cp.id
      WHERE cl.user_id = $1 AND cl.deleted_at IS NULL
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
        CASE 
          WHEN hl.status = 'approved' AND hl.created_at <= NOW() - INTERVAL '7 days' THEN 'expired'
          ELSE hl.status
        END as status,
        hl.rejection_reason,
        hl.created_at,
        hl.updated_at,
        'housing' as listing_type,
        hl.property_type as brand_name,
        hl.room_count as product_name
      FROM housing_listings hl
      WHERE hl.user_id = $1 AND hl.deleted_at IS NULL
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
    
    console.log('getUserListings sonuç:', {
      userId,
      totalRows: result.rows.length,
      listings: result.rows.map(r => ({ id: r.id, title: r.title, type: r.listing_type }))
    });

    // Toplam ilan sayısını getir (soft delete edilmemiş)
    const countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM watch_listings WHERE user_id = $1 AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM cars_listings WHERE user_id = $1 AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM housing_listings WHERE user_id = $1 AND deleted_at IS NULL) as total_count
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
            'watch' as listing_type,
            CASE 
              WHEN wl.status = 'approved' AND wl.created_at <= NOW() - INTERVAL '7 days' THEN 'expired'
              ELSE wl.status
            END as status
          FROM watch_listings wl
          LEFT JOIN watch_brands wb ON wl.brand_id = wb.id
          LEFT JOIN watch_products wp ON wl.product_id = wp.id
          WHERE wl.user_id = $1 AND wl.deleted_at IS NULL
          ORDER BY wl.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        countQuery = `SELECT COUNT(*) FROM watch_listings WHERE user_id = $1 AND deleted_at IS NULL`;
        break;

      case 'car':
        query = `
          SELECT 
            cl.*,
            cb.name as brand_name,
            cp.name as product_name,
            'car' as listing_type,
            CASE 
              WHEN cl.status = 'approved' AND cl.created_at <= NOW() - INTERVAL '7 days' THEN 'expired'
              ELSE cl.status
            END as status
          FROM cars_listings cl
          LEFT JOIN cars_brands cb ON cl.brand_id = cb.id
          LEFT JOIN cars_products cp ON cl.product_id = cp.id
          WHERE cl.user_id = $1 AND cl.deleted_at IS NULL
          ORDER BY cl.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        countQuery = `SELECT COUNT(*) FROM cars_listings WHERE user_id = $1 AND deleted_at IS NULL`;
        break;

      case 'housing':
        query = `
          SELECT 
            hl.*,
            'housing' as listing_type,
            CASE 
              WHEN hl.status = 'approved' AND hl.created_at <= NOW() - INTERVAL '7 days' THEN 'expired'
              ELSE hl.status
            END as status
          FROM housing_listings hl
          WHERE hl.user_id = $1 AND hl.deleted_at IS NULL
          ORDER BY hl.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        countQuery = `SELECT COUNT(*) FROM housing_listings WHERE user_id = $1 AND deleted_at IS NULL`;
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

// İlan süresini uzat
const extendListingDuration = async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId, listingType } = req.body;

    if (!listingId || !listingType) {
      return res.status(400).json({
        success: false,
        message: 'İlan ID ve ilan türü gereklidir'
      });
    }

    // İlan türüne göre tablo ve sorgu belirle
    let tableName, query, checkQuery;
    
    switch (listingType) {
      case 'watch':
        tableName = 'watch_listings';
        checkQuery = `
          SELECT id, status, expires_at, user_id 
          FROM watch_listings 
          WHERE id = $1 AND user_id = $2
        `;
        query = `
          UPDATE watch_listings 
          SET expires_at = NOW() + INTERVAL '7 days',
              updated_at = NOW(),
              status = CASE 
                WHEN status = 'expired' THEN 'approved'
                ELSE status
              END
          WHERE id = $1 AND user_id = $2
          RETURNING id, title, status, expires_at
        `;
        break;
      case 'car':
        tableName = 'cars_listings';
        checkQuery = `
          SELECT id, status, expires_at, user_id 
          FROM cars_listings 
          WHERE id = $1 AND user_id = $2
        `;
        query = `
          UPDATE cars_listings 
          SET expires_at = NOW() + INTERVAL '7 days',
              updated_at = NOW(),
              status = CASE 
                WHEN status = 'expired' THEN 'approved'
                ELSE status
              END
          WHERE id = $1 AND user_id = $2
          RETURNING id, title, status, expires_at
        `;
        break;
      case 'housing':
        tableName = 'housing_listings';
        checkQuery = `
          SELECT id, status, expires_at, user_id 
          FROM housing_listings 
          WHERE id = $1 AND user_id = $2
        `;
        query = `
          UPDATE housing_listings 
          SET expires_at = NOW() + INTERVAL '7 days',
              updated_at = NOW(),
              status = CASE 
                WHEN status = 'expired' THEN 'approved'
                ELSE status
              END
          WHERE id = $1 AND user_id = $2
          RETURNING id, title, status, expires_at
        `;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Geçersiz ilan türü'
        });
    }

    // İlanın varlığını ve sahipliğini kontrol et
    const checkResult = await db.query(checkQuery, [listingId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı veya size ait değil'
      });
    }

    const listing = checkResult.rows[0];
    
    // İlanın süresi dolmuş mu kontrol et
    let isExpired = false;
    
    if (listingType === 'housing' || listingType === 'watch') {
      // Housing ve watch ilanları için expires_at tarihini kontrol et
      const expiresAt = new Date(listing.expires_at);
      const now = new Date();
      isExpired = expiresAt <= now;
    } else {
      // Car ilanları için expires_at tarihini kontrol et (artık tüm ilan türleri expires_at kullanıyor)
      const expiresAt = new Date(listing.expires_at);
      const now = new Date();
      isExpired = expiresAt <= now;
    }
    
    if (listing.status !== 'approved' && listing.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Sadece onaylanmış veya süresi dolmuş ilanların süresi uzatılabilir'
      });
    }
    
    if (!isExpired && listing.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Sadece süresi dolmuş ilanların süresi uzatılabilir'
      });
    }

    // İlan süresini uzat
    const result = await db.query(query, [listingId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan güncellenemedi'
      });
    }

    const updatedListing = result.rows[0];

    // İşlem kaydını transactions tablosuna ekle
    try {
      const transactionQuery = `
        INSERT INTO transactions (
          user_id, listing_id, listing_title, listing_type, transaction_type,
          amount, extension_days, old_expiry_date, new_expiry_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const transactionValues = [
        userId,
        listingId,
        updatedListing.title,
        listingType,
        'extension',
        50.00, // Uzatma ücreti
        7, // Uzatma gün sayısı
        listing.expires_at, // Eski bitiş tarihi
        updatedListing.expires_at, // Yeni bitiş tarihi
        'completed'
      ];

      await db.query(transactionQuery, transactionValues);
    } catch (transactionError) {
      console.error('İşlem kaydı oluşturulurken hata:', transactionError);
      // İşlem kaydı başarısız olsa bile uzatma işlemi başarılı sayılır
    }

    res.json({
      success: true,
      message: 'İlan süresi başarıyla 7 gün uzatıldı',
      data: {
        id: updatedListing.id,
        title: updatedListing.title,
        status: updatedListing.status,
        newExpiryDate: updatedListing.expires_at
      }
    });

  } catch (error) {
    console.error('İlan süresi uzatma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan süresi uzatılırken bir hata oluştu'
    });
  }
};

// İlan silme
const deleteListing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;
    const { listing_type } = req.query; // Query parametresinden listing_type al

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: 'İlan ID gereklidir'
      });
    }

    console.log('deleteListing çağrıldı:', { listingId, listing_type, userId });

    // İlanın tipini ve sahibini kontrol et
    let listing = null;
    let listingType = listing_type; // Frontend'den gelen tipi kullan

    // Eğer listing_type belirtilmişse sadece o tabloya bak
    if (listingType === 'watch') {
      const watchResult = await db.query(
        'SELECT id, user_id, status, deleted_at FROM watch_listings WHERE id = $1 AND deleted_at IS NULL',
        [listingId]
      );
      if (watchResult.rows.length > 0) {
        listing = watchResult.rows[0];
      }
    } else if (listingType === 'car') {
      const carResult = await db.query(
        'SELECT id, user_id, status, deleted_at FROM cars_listings WHERE id = $1 AND deleted_at IS NULL',
        [listingId]
      );
      if (carResult.rows.length > 0) {
        listing = carResult.rows[0];
      }
    } else if (listingType === 'housing') {
      const housingResult = await db.query(
        'SELECT id, user_id, status, deleted_at FROM housing_listings WHERE id = $1 AND deleted_at IS NULL',
        [listingId]
      );
      if (housingResult.rows.length > 0) {
        listing = housingResult.rows[0];
      }
    } else {
      // Listing type belirtilmemişse eski mantık (sırayla ara)
      // Watch ilanını kontrol et
      const watchResult = await db.query(
        'SELECT id, user_id, status, deleted_at FROM watch_listings WHERE id = $1 AND deleted_at IS NULL',
        [listingId]
      );

      if (watchResult.rows.length > 0) {
        listing = watchResult.rows[0];
        listingType = 'watch';
      }

      // Car ilanını kontrol et
      if (!listing) {
        const carResult = await db.query(
          'SELECT id, user_id, status, deleted_at FROM cars_listings WHERE id = $1 AND deleted_at IS NULL',
          [listingId]
        );

        if (carResult.rows.length > 0) {
          listing = carResult.rows[0];
          listingType = 'car';
        }
      }

      // Housing ilanını kontrol et
      if (!listing) {
        const housingResult = await db.query(
          'SELECT id, user_id, status, deleted_at FROM housing_listings WHERE id = $1 AND deleted_at IS NULL',
          [listingId]
        );

        if (housingResult.rows.length > 0) {
          listing = housingResult.rows[0];
          listingType = 'housing';
        }
      }
    }

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı veya zaten silinmiş'
      });
    }

    // İlanın sahibi mi kontrol et (tip dönüşümü ile)
    console.log('Sahiplik kontrolü:', { listingUserId: listing.user_id, requestUserId: userId, types: { listing: typeof listing.user_id, request: typeof userId } });
    if (parseInt(listing.user_id) !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Bu ilanı silme yetkiniz yok'
      });
    }

    // Sadece approved veya expired ilanlar silinebilir (pending ve rejected silinemez)
    if (listing.status !== 'approved' && listing.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: `Sadece onaylanmış veya süresi dolmuş ilanlar silinebilir. Mevcut durum: ${listing.status}`
      });
    }

    // İlanı soft delete yap (deleted_at timestamp'ini set et)
    let softDeleteQuery = '';
    switch (listingType) {
      case 'watch':
        softDeleteQuery = 'UPDATE watch_listings SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL';
        break;
      case 'car':
        softDeleteQuery = 'UPDATE cars_listings SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL';
        break;
      case 'housing':
        softDeleteQuery = 'UPDATE housing_listings SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL';
        break;
    }

    console.log('İlan soft delete yapılıyor:', { listingId, listingType });
    const deleteResult = await db.query(softDeleteQuery, [listingId]);
    console.log('Soft delete sonucu:', { rowCount: deleteResult.rowCount });

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan silinemedi - kayıt bulunamadı veya zaten silinmiş'
      });
    }

    res.json({
      success: true,
      message: 'İlan başarıyla silindi',
      deletedCount: deleteResult.rowCount
    });
  } catch (error) {
    console.error('İlan silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan silinirken bir hata oluştu'
    });
  }
};

module.exports = {
  getUserListings,
  getUserListingsByType,
  extendListingDuration,
  deleteListing
};