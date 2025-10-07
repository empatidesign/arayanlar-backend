const db = require('../services/database');

// Mevcut ilan limitini getir
const getListingLimit = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM listing_limits WHERE is_active = TRUE ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aktif ilan limiti bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching listing limit:', error);
    res.status(500).json({
      success: false,
      message: 'İlan limiti alınırken hata oluştu'
    });
  }
};

// İlan limitini güncelle
const updateListingLimit = async (req, res) => {
  try {
    const { daily_limit } = req.body;
    
    if (!daily_limit || daily_limit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir günlük limit değeri giriniz (minimum 1)'
      });
    }

    // Mevcut aktif limiti pasif yap
    await db.query('UPDATE listing_limits SET is_active = FALSE WHERE is_active = TRUE');
    
    // Yeni limit ekle
    const result = await db.query(
      'INSERT INTO listing_limits (daily_limit, is_active) VALUES ($1, TRUE) RETURNING *',
      [daily_limit]
    );
    
    res.json({
      success: true,
      message: 'İlan limiti başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating listing limit:', error);
    res.status(500).json({
      success: false,
      message: 'İlan limiti güncellenirken hata oluştu'
    });
  }
};

// Kullanıcının günlük ilan sayısını getir
const getUserDailyCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında
    
    const result = await db.query(
      'SELECT count FROM user_daily_listing_count WHERE user_id = $1 AND listing_date = $2',
      [userId, today]
    );
    
    const count = result.rows.length > 0 ? result.rows[0].count : 0;
    
    // Aktif limiti de getir
    const limitResult = await db.query(
      'SELECT daily_limit FROM listing_limits WHERE is_active = TRUE ORDER BY id DESC LIMIT 1'
    );
    
    const dailyLimit = limitResult.rows.length > 0 ? limitResult.rows[0].daily_limit : 50;
    
    res.json({
      success: true,
      data: {
        current_count: count,
        daily_limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - count),
        can_post: count < dailyLimit
      }
    });
  } catch (error) {
    console.error('Error fetching user daily count:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı ilan sayısı alınırken hata oluştu'
    });
  }
};

// Tüm kullanıcıların günlük ilan sayılarını getir (admin)
const getAllUsersDailyCount = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // First, get the current daily limit or use default
    const limitResult = await db.query(
      'SELECT daily_limit FROM listing_limits WHERE is_active = TRUE ORDER BY id DESC LIMIT 1'
    );
    const dailyLimit = limitResult.rows.length > 0 ? limitResult.rows[0].daily_limit : 50;
    
    // Then get users with their daily counts (using 'name' instead of 'username')
    const result = await db.query(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        COALESCE(udlc.count, 0) as daily_count,
        $2::integer as daily_limit,
        ($2::integer - COALESCE(udlc.count, 0)) as remaining
      FROM users u
      LEFT JOIN user_daily_listing_count udlc ON u.id = udlc.user_id AND udlc.listing_date = $1
      ORDER BY udlc.count DESC NULLS LAST, u.name
    `, [targetDate, dailyLimit]);
    
    res.json({
      success: true,
      data: {
        date: targetDate,
        users: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching all users daily count:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı ilan sayıları alınırken hata oluştu'
    });
  }
};

// Günlük sayaçları sıfırla (scheduler tarafından çağrılacak)
const resetDailyCounts = async (req, res) => {
  try {
    // Bugünden önceki kayıtları sil (opsiyonel - geçmiş verileri tutmak isteyebiliriz)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Sadece 30 günden eski kayıtları sil (performans için)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const result = await db.query(
      'DELETE FROM user_daily_listing_count WHERE listing_date < $1',
      [thirtyDaysAgoStr]
    );
    
    res.json({
      success: true,
      message: `Eski kayıtlar temizlendi. ${result.rowCount} kayıt silindi.`
    });
  } catch (error) {
    console.error('Error resetting daily counts:', error);
    res.status(500).json({
      success: false,
      message: 'Günlük sayaçlar sıfırlanırken hata oluştu'
    });
  }
};

// Kullanıcının ilan sayısını artır (ilan oluşturulduğunda çağrılacak)
const incrementUserCount = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Upsert işlemi - kayıt varsa artır, yoksa oluştur
    const result = await db.query(`
      INSERT INTO user_daily_listing_count (user_id, listing_date, count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, listing_date)
      DO UPDATE SET 
        count = user_daily_listing_count.count + 1,
        updated_at = CURRENT_TIMESTAMP
      RETURNING count
    `, [userId, today]);
    
    return result.rows[0].count;
  } catch (error) {
    console.error('Error incrementing user count:', error);
    throw error;
  }
};

// Kullanıcının ilan limitini kontrol et
const checkUserLimit = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Kullanıcının bugünkü ilan sayısını getir
    const countResult = await db.query(
      'SELECT count FROM user_daily_listing_count WHERE user_id = $1 AND listing_date = $2',
      [userId, today]
    );
    
    const currentCount = countResult.rows.length > 0 ? countResult.rows[0].count : 0;
    
    // Aktif limiti getir
    const limitResult = await db.query(
      'SELECT daily_limit FROM listing_limits WHERE is_active = TRUE ORDER BY id DESC LIMIT 1'
    );
    
    const dailyLimit = limitResult.rows.length > 0 ? limitResult.rows[0].daily_limit : 50;
    
    return {
      current_count: currentCount,
      daily_limit: dailyLimit,
      can_post: currentCount < dailyLimit,
      remaining: Math.max(0, dailyLimit - currentCount)
    };
  } catch (error) {
    console.error('Error checking user limit:', error);
    throw error;
  }
};

/**
 * Belirli bir kullanıcının günlük sayacını sıfırla
 */
const resetUserCount = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await db.query(
      `UPDATE user_daily_listing_count 
       SET count = 0, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND listing_date = $2`,
      [userId, today]
    );
    
    console.log(`User ${userId} daily listing count reset for ${today}`);
    return { success: true, message: `User ${userId} count reset successfully` };
  } catch (error) {
    console.error('Error resetting user count:', error);
    throw error;
  }
};

module.exports = {
  getListingLimit,
  updateListingLimit,
  getUserDailyCount,
  getAllUsersDailyCount,
  resetDailyCounts,
  incrementUserCount,
  checkUserLimit,
  resetUserCount
};