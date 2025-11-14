const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const notificationService = require('../services/notificationService');
const db = require('../services/database');

// Admin kontrolü middleware
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin yetki kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yetki kontrolü yapılamadı'
    });
  }
};

// Tüm kullanıcılara bildirim gönder
router.post('/send-to-all', authenticateToken, requireAdmin, adminLimiter, async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve mesaj gereklidir'
      });
    }

    // Tüm aktif kullanıcıları al
    const usersResult = await db.query(
      'SELECT DISTINCT user_id FROM user_fcm_tokens WHERE is_active = true'
    );

    const userIds = usersResult.rows.map(row => row.user_id);

    if (userIds.length === 0) {
      return res.json({
        success: true,
        message: 'Bildirim gönderilecek kullanıcı bulunamadı',
        successCount: 0,
        failureCount: 0,
        totalUsers: 0
      });
    }

    console.log(`📢 Toplu bildirim gönderiliyor: ${userIds.length} kullanıcıya`);

    // Toplu bildirim gönder
    const result = await notificationService.sendBulkNotification(
      userIds,
      { title, body },
      data || { type: 'broadcast' }
    );

    res.json({
      success: true,
      message: `Bildirim ${result.successCount} kullanıcıya başarıyla gönderildi`,
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalUsers: userIds.length
    });

  } catch (error) {
    console.error('Toplu bildirim gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim gönderilemedi',
      error: error.message
    });
  }
});

// İstatistikler
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Toplam kullanıcı sayısı
    const totalUsersResult = await db.query('SELECT COUNT(*) as count FROM users');
    
    // Aktif FCM token sayısı
    const activeTokensResult = await db.query(
      'SELECT COUNT(DISTINCT user_id) as count FROM user_fcm_tokens WHERE is_active = true'
    );

    // Son 24 saatte gönderilen bildirimler
    const recentNotificationsResult = await db.query(
      'SELECT COUNT(*) as count FROM notification_history WHERE sent_at > NOW() - INTERVAL \'24 hours\''
    );

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(totalUsersResult.rows[0].count),
        usersWithNotifications: parseInt(activeTokensResult.rows[0].count),
        notificationsLast24h: parseInt(recentNotificationsResult.rows[0].count)
      }
    });

  } catch (error) {
    console.error('İstatistik alma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı'
    });
  }
});

module.exports = router;
