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
    
    // Admin yetkisi kontrolü
    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }
    
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
module.exports = {
  requireAdmin
};
