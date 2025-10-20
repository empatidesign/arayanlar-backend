const db = require('../../services/database');

/**
 * Dashboard için genel istatistikleri getir
 * Watch, car ve housing ilanları için detaylı sayılar
 */
const getDashboardStats = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    // Watch ilanları istatistikleri
    const watchStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'expired') as expired
      FROM watch_listings
    `;

    // Car ilanları istatistikleri
    const carStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'expired') as expired
      FROM cars_listings
    `;

    // Housing ilanları istatistikleri
    const housingStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'expired') as expired
      FROM housing_listings
    `;

    // Kullanıcı istatistikleri
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
        COUNT(*) FILTER (WHERE role = 'user') as user_count,
        COUNT(*) FILTER (WHERE is_verified = true) as verified_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_last_30_days
      FROM users
    `;

    // Kategori sayısı
    const categoryStatsQuery = `
      SELECT COUNT(*) as total_categories
      FROM sections
    `;

    // Mesaj sayısı
    const messageStatsQuery = `
      SELECT COUNT(*) as total_messages
      FROM messages
    `;

    // Tüm sorguları paralel olarak çalıştır
    const [watchStats, carStats, housingStats, userStats, categoryStats, messageStats] = await Promise.all([
      db.query(watchStatsQuery),
      db.query(carStatsQuery),
      db.query(housingStatsQuery),
      db.query(userStatsQuery),
      db.query(categoryStatsQuery),
      db.query(messageStatsQuery)
    ]);

    // Toplam ilan sayıları
    const totalListings = {
      total: parseInt(watchStats.rows[0].total) + parseInt(carStats.rows[0].total) + parseInt(housingStats.rows[0].total),
      pending: parseInt(watchStats.rows[0].pending) + parseInt(carStats.rows[0].pending) + parseInt(housingStats.rows[0].pending),
      approved: parseInt(watchStats.rows[0].approved) + parseInt(carStats.rows[0].approved) + parseInt(housingStats.rows[0].approved),
      rejected: parseInt(watchStats.rows[0].rejected) + parseInt(carStats.rows[0].rejected) + parseInt(housingStats.rows[0].rejected),
      expired: parseInt(watchStats.rows[0].expired) + parseInt(carStats.rows[0].expired) + parseInt(housingStats.rows[0].expired)
    };

    res.json({
      success: true,
      data: {
        watchListings: {
          total: parseInt(watchStats.rows[0].total),
          pending: parseInt(watchStats.rows[0].pending),
          approved: parseInt(watchStats.rows[0].approved),
          rejected: parseInt(watchStats.rows[0].rejected),
          expired: parseInt(watchStats.rows[0].expired)
        },
        carListings: {
          total: parseInt(carStats.rows[0].total),
          pending: parseInt(carStats.rows[0].pending),
          approved: parseInt(carStats.rows[0].approved),
          rejected: parseInt(carStats.rows[0].rejected),
          expired: parseInt(carStats.rows[0].expired)
        },
        housingListings: {
          total: parseInt(housingStats.rows[0].total),
          pending: parseInt(housingStats.rows[0].pending),
          approved: parseInt(housingStats.rows[0].approved),
          rejected: parseInt(housingStats.rows[0].rejected),
          expired: parseInt(housingStats.rows[0].expired)
        },
        totalListings: totalListings,
        users: {
          total: parseInt(userStats.rows[0].total_users),
          admin: parseInt(userStats.rows[0].admin_count),
          regular: parseInt(userStats.rows[0].user_count),
          verified: parseInt(userStats.rows[0].verified_count),
          newInLast30Days: parseInt(userStats.rows[0].new_users_last_30_days)
        },
        categories: {
          total: parseInt(categoryStats.rows[0].total_categories)
        },
        messages: {
          total: parseInt(messageStats.rows[0].total_messages)
        }
      }
    });

  } catch (error) {
    console.error('Dashboard istatistikleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard istatistikleri getirilemedi',
      error: error.message
    });
  }
};

/**
 * Son mesajları getir (dashboard için)
 */
const getRecentMessages = async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const { limit = 10 } = req.query;

    // Son mesajları getir (örnek - gerçek mesaj tablosu yapısına göre düzenlenebilir)
    const messagesQuery = `
      SELECT 
        'contact' as message_type,
        'İletişim Formu' as title,
        'Yeni iletişim mesajı' as content,
        NOW() - INTERVAL '1 hour' as created_at
      LIMIT $1
    `;

    const result = await db.query(messagesQuery, [parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Son mesajlar getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Son mesajlar getirilemedi',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentMessages
};