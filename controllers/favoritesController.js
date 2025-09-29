const db = require('../services/database');

// Kullanıcının favorilerini getir
const getUserFavorites = async (req, res) => {
  console.log('getUserFavorites çağrıldı, user ID:', req.user?.id);
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        f.id as favorite_id,
        f.created_at as favorited_at,
        l.*
      FROM favorites f
      JOIN listings l ON f.listing_id = l.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `;

    const result = await db.query(query, [userId]);
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
    const { listing_id } = req.body;

    console.log('Eklenmek istenen listing ID:', listing_id);

    if (!listing_id) {
      console.log('Listing ID eksik');
      return res.status(400).json({
        success: false,
        message: 'İlan ID gerekli'
      });
    }

    // İlan var mı kontrol et
    const listingCheck = await db.query(
      'SELECT id FROM listings WHERE id = $1',
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
      'SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2',
      [userId, listing_id]
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
    const query = `
      INSERT INTO favorites (user_id, listing_id)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await db.query(query, [userId, listing_id]);
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

    console.log('Kaldırılmak istenen listing ID:', listing_id);

    if (!listing_id || isNaN(parseInt(listing_id))) {
      console.log('Listing ID eksik veya geçersiz');
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ilan ID gerekli'
      });
    }

    // Favori var mı kontrol et
    const existingFavorite = await db.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2',
      [parseInt(userId), parseInt(listing_id)]
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
      WHERE user_id = $1 AND listing_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [parseInt(userId), parseInt(listing_id)]);
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
  
  try {
    const userId = req.user.id;
    const { listing_id } = req.params;

    console.log('Kontrol edilmek istenen listing ID:', listing_id);

    if (!listing_id) {
      console.log('Listing ID eksik');
      return res.status(400).json({
        success: false,
        message: 'İlan ID gerekli'
      });
    }

    // Favori durumunu kontrol et
    const query = `
      SELECT id FROM favorites 
      WHERE user_id = $1 AND listing_id = $2
    `;

    const result = await db.query(query, [userId, listing_id]);
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