const db = require('../../services/database');

// Kullanıcıyı banla
const banUser = async (req, res) => {
  try {
    const { userId, reason, banDuration, banType } = req.body;
    const adminId = req.user.id;

    // Gerekli alanları kontrol et
    if (!userId || !reason || !banType) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID, ban sebebi ve türü gereklidir'
      });
    }

    // Kullanıcının var olup olmadığını kontrol et
    const userCheck = await db.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Ban süresini hesapla
    let bannedUntil = null;
    if (banType === 'temporary' && banDuration) {
      const now = new Date();
      bannedUntil = new Date(now.getTime() + (banDuration * 60 * 60 * 1000)); // saat cinsinden
    }

    // Mevcut aktif banları pasif yap
    await db.query(
      'UPDATE user_bans SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );

    // Yeni ban kaydı oluştur
    const banResult = await db.query(`
      INSERT INTO user_bans (user_id, reason, banned_until, banned_by, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *
    `, [userId, reason, bannedUntil, adminId]);

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla banlandı',
      data: banResult.rows[0]
    });

  } catch (error) {
    console.error('Kullanıcı banlama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı banlanırken bir hata oluştu'
    });
  }
};

// Kullanıcının ban durumunu kontrol et
const checkUserBanStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const banCheck = await db.query(`
      SELECT ub.*, u.name as banned_by_name
      FROM user_bans ub
      LEFT JOIN users u ON ub.banned_by = u.id
      WHERE ub.user_id = $1 
        AND ub.is_active = TRUE 
        AND (ub.banned_until IS NULL OR ub.banned_until > NOW())
      ORDER BY ub.created_at DESC
      LIMIT 1
    `, [userId]);

    if (banCheck.rows.length > 0) {
      const ban = banCheck.rows[0];
      return res.json({
        success: true,
        isBanned: true,
        banInfo: {
          reason: ban.reason,
          bannedUntil: ban.banned_until,
          bannedBy: ban.banned_by_name,
          createdAt: ban.created_at,
          isPermanent: ban.banned_until === null
        }
      });
    }

    res.json({
      success: true,
      isBanned: false
    });

  } catch (error) {
    console.error('Ban durumu kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ban durumu kontrol edilirken bir hata oluştu'
    });
  }
};

// Ban kaldır
const unbanUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const adminId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gereklidir'
      });
    }

    // Aktif banları pasif yap
    const result = await db.query(
      'UPDATE user_bans SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcının aktif bir banı bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Kullanıcının banı başarıyla kaldırıldı'
    });

  } catch (error) {
    console.error('Ban kaldırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ban kaldırılırken bir hata oluştu'
    });
  }
};

// Kullanıcının ban geçmişini getir
const getUserBanHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const banHistory = await db.query(`
      SELECT ub.*, u.name as banned_by_name
      FROM user_bans ub
      LEFT JOIN users u ON ub.banned_by = u.id
      WHERE ub.user_id = $1
      ORDER BY ub.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: banHistory.rows
    });

  } catch (error) {
    console.error('Ban geçmişi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ban geçmişi getirilirken bir hata oluştu'
    });
  }
};

// Süresi dolan banları otomatik olarak pasif yap
const deactivateExpiredBans = async () => {
  try {
    const result = await db.query(`
      UPDATE user_bans 
      SET is_active = FALSE 
      WHERE is_active = TRUE 
        AND banned_until IS NOT NULL 
        AND banned_until <= NOW()
    `);

    console.log(`${result.rowCount} süresi dolan ban pasif yapıldı`);
  } catch (error) {
    console.error('Süresi dolan banları pasif yapma hatası:', error);
  }
};

module.exports = {
  banUser,
  checkUserBanStatus,
  unbanUser,
  getUserBanHistory,
  deactivateExpiredBans
};