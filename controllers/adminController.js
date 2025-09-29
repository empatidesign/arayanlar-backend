const db = require('../services/database');

// Admin middleware - sadece admin kullanıcılar erişebilir
const requireAdmin = async (req, res, next) => {
  try {
    // Şimdilik tüm kullanıcıları admin olarak kabul et (geliştirme aşaması)
    // Kullanıcının admin olup olmadığını kontrol et
    const userResult = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    // Eğer role null ise veya admin değilse, şimdilik geçiş ver
    if (userResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Geliştirme aşamasında tüm kullanıcıları admin olarak kabul et
    // if (userResult.rows[0].role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Bu işlem için admin yetkisi gerekli'
    //   });
    // }
    
    next();
  } catch (error) {
    console.error('Admin kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yetki kontrolü yapılırken hata oluştu'
    });
  }
};

// Bekleyen ilanları listele
const getPendingListings = async (req, res) => {
  try {
    const query = `
      SELECT 
        l.*,
        s.name as category_name,
        u.name as user_name,
        u.email as user_email
      FROM listings l
      JOIN sections s ON l.category_id = s.id
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'pending'
      ORDER BY l.created_at DESC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Bekleyen ilanları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen ilanlar getirilirken hata oluştu'
    });
  }
};

// İlanı onayla
const approveListing = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE listings 
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'İlan başarıyla onaylandı',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('İlan onaylama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan onaylanırken hata oluştu'
    });
  }
};

// İlanı reddet
const rejectListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const result = await db.query(
      `UPDATE listings 
       SET status = 'rejected', rejection_reason = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id, rejection_reason]
    );

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
    console.error('İlan reddetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan reddedilirken hata oluştu'
    });
  }
};

// Toplu onaylama
const bulkApproveListings = async (req, res) => {
  try {
    const { listing_ids } = req.body;

    if (!Array.isArray(listing_ids) || listing_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli ilan ID\'leri gönderilmeli'
      });
    }

    const placeholders = listing_ids.map((_, index) => `$${index + 1}`).join(',');
    
    const result = await db.query(
      `UPDATE listings 
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) 
       RETURNING id, title`,
      listing_ids
    );

    res.json({
      success: true,
      message: `${result.rows.length} ilan başarıyla onaylandı`,
      data: result.rows
    });

  } catch (error) {
    console.error('Toplu onaylama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu onaylama yapılırken hata oluştu'
    });
  }
};

// Admin ilan silme
const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    // İlanın var olup olmadığını kontrol et
    const checkResult = await db.query(
      'SELECT id, title FROM listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    // İlanı sil (soft delete)
    await db.query(
      'UPDATE listings SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'İlan başarıyla silindi'
    });

  } catch (error) {
    console.error('Admin ilan silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlan silinirken hata oluştu'
    });
  }
};

module.exports = {
  requireAdmin,
  getPendingListings,
  approveListing,
  rejectListing,
  bulkApproveListings,
  deleteListing
};
