const db = require('../services/database');

// Yeni ilan oluştur
const createListing = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      category_id,
      price,
      currency = 'TL',
      location_city,
      location_district,
      location_address,
      images = [],
      main_image,
      contact_phone,
      contact_email,
      contact_whatsapp,
      category_data = {},
      package_type = 'free',
      package_name,
      package_price = 0,
      duration_days = 7,
      has_serious_buyer_badge = false,
      status = 'pending',
      expires_at = null
    } = req.body;

    // Gerekli alanları kontrol et
    if (!title || !category_id || !location_city) {
      return res.status(400).json({
        success: false,
        message: 'Başlık, kategori ve şehir bilgileri gereklidir'
      });
    }

    // İlanı veritabanına ekle
    const query = `
      INSERT INTO listings (
        user_id, title, description, category_id, price, currency,
        location_city, location_district, location_address,
        images, main_image, contact_phone, contact_email, contact_whatsapp,
        category_data, package_type, package_name, package_price,
        duration_days, has_serious_buyer_badge, status, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *
    `;

    const values = [
      userId, title, description, category_id, price, currency,
      location_city, location_district, location_address,
      JSON.stringify(images), main_image, contact_phone, contact_email, contact_whatsapp,
      JSON.stringify(category_data), package_type, package_name, package_price,
      duration_days, has_serious_buyer_badge, status, expires_at
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      success: true,
      message: 'İlan başarıyla oluşturuldu',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('İlan oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan oluşturulamadı',
      error: error.message
    });
  }
};

// İlanı onayla
const approveListing = async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın mevcut bilgilerini al
    const existingListing = await db.query(
      'SELECT duration_days FROM listings WHERE id = $1',
      [id]
    );

    if (existingListing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const durationDays = existingListing.rows[0].duration_days || 7;

    // İlanı onayla ve expires_at'i hesapla
    const result = await db.query(`
      UPDATE listings 
      SET status = 'approved', 
          expires_at = NOW() + INTERVAL '1 day' * $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, durationDays]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    res.json({
      success: true,
      message: `İlan başarıyla onaylandı ve ${durationDays} günlük süre başlatıldı`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('İlan onaylanırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan onaylanamadı',
      error: error.message
    });
  }
};

// İlanı reddet
const rejectListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'Red sebebi gereklidir'
      });
    }

    const result = await db.query(`
      UPDATE listings 
      SET status = 'rejected', 
          rejection_reason = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, rejection_reason]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'İlan başarıyla reddedildi',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('İlan reddedilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlan reddedilemedi',
      error: error.message
    });
  }
};

// Bekleyen ilanları listele (Admin)
const getPendingListings = async (req, res) => {
  try {
    const query = `
      SELECT l.*, u.name as user_name, u.surname as user_surname, u.email as user_email
      FROM listings l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.status = 'pending'
      ORDER BY l.created_at DESC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Bekleyen ilanlar listelenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen ilanlar listelenemedi',
      error: error.message
    });
  }
};

// Toplu onaylama
const bulkApproveListing = async (req, res) => {
  try {
    const { listing_ids } = req.body;

    if (!listing_ids || !Array.isArray(listing_ids) || listing_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'İlan ID\'leri gereklidir'
      });
    }

    // Her ilan için duration_days'i al ve onaylama işlemini yap
    const results = [];
    for (const listingId of listing_ids) {
      const existingListing = await db.query(
        'SELECT duration_days FROM listings WHERE id = $1',
        [listingId]
      );

      if (existingListing.rows.length > 0) {
        const durationDays = existingListing.rows[0].duration_days || 7;
        
        const result = await db.query(`
          UPDATE listings 
          SET status = 'approved', 
              expires_at = NOW() + INTERVAL '1 day' * $2,
              updated_at = NOW()
          WHERE id = $1
          RETURNING id, title
        `, [listingId, durationDays]);

        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }
    }

    res.json({
      success: true,
      message: `${results.length} ilan başarıyla onaylandı`,
      data: results
    });

  } catch (error) {
    console.error('Toplu onaylama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu onaylama yapılamadı',
      error: error.message
    });
  }
};

module.exports = {
  createListing,
  approveListing,
  rejectListing,
  getPendingListings,
  bulkApproveListing
};