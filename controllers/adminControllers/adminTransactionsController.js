const db = require('../../services/database');

// Admin middleware - kullanıcının admin olup olmadığını kontrol eder
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcının admin rolü olup olmadığını kontrol et
    const result = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    if (!result.rows[0] || result.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yetki kontrolü sırasında hata oluştu'
    });
  }
};

// Tüm işlemleri getir (Admin)
const getAllTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      status, 
      user_id, 
      start_date, 
      end_date,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Base query with user information
    let query = `
      SELECT 
        t.id,
        t.user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        t.listing_id,
        t.listing_title,
        t.listing_type,
        t.transaction_type,
        t.amount,
        t.payment_date,
        t.extension_days,
        t.old_expiry_date,
        t.new_expiry_date,
        t.status,
        t.payment_method,
        t.payment_reference,
        t.created_at,
        t.updated_at
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    
    let queryParams = [];
    let paramIndex = 1;
    
    // Filtreleme seçenekleri
    if (type && ['car', 'watch', 'housing'].includes(type)) {
      query += ` AND t.listing_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }
    
    if (status && ['completed', 'pending', 'failed'].includes(status)) {
      query += ` AND t.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    if (user_id) {
      query += ` AND t.user_id = $${paramIndex}`;
      queryParams.push(parseInt(user_id));
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND t.payment_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND t.payment_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (t.listing_title ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Sıralama ve sayfalama
    query += ` ORDER BY t.payment_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await db.query(query, queryParams);
    
    // Toplam kayıt sayısını al
    let countQuery = `
      SELECT COUNT(*) 
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    let countParams = [];
    let countParamIndex = 1;
    
    // Aynı filtreleri count query'sine de uygula
    if (type && ['car', 'watch', 'housing'].includes(type)) {
      countQuery += ` AND t.listing_type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }
    
    if (status && ['completed', 'pending', 'failed'].includes(status)) {
      countQuery += ` AND t.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (user_id) {
      countQuery += ` AND t.user_id = $${countParamIndex}`;
      countParams.push(parseInt(user_id));
      countParamIndex++;
    }
    
    if (start_date) {
      countQuery += ` AND t.payment_date >= $${countParamIndex}`;
      countParams.push(start_date);
      countParamIndex++;
    }
    
    if (end_date) {
      countQuery += ` AND t.payment_date <= $${countParamIndex}`;
      countParams.push(end_date);
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (t.listing_title ILIKE $${countParamIndex} OR u.name ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('İşlemler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İşlemler getirilirken hata oluştu'
    });
  }
};

// İşlem detaylarını getir (Admin)
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        t.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.created_at as user_created_at
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İşlem bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('İşlem detayları getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem detayları getirilirken hata oluştu'
    });
  }
};

// İşlem istatistikleri (Admin)
const getTransactionStats = async (req, res) => {
  try {
    // Genel istatistikler
    const statsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_transaction_amount
      FROM transactions
    `;
    
    // Kategori bazında istatistikler
    const categoryStatsQuery = `
      SELECT 
        listing_type,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue
      FROM transactions
      GROUP BY listing_type
      ORDER BY count DESC
    `;
    
    // Aylık istatistikler (son 12 ay)
    const monthlyStatsQuery = `
      SELECT 
        DATE_TRUNC('month', payment_date) as month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as monthly_revenue
      FROM transactions
      WHERE payment_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', payment_date)
      ORDER BY month DESC
    `;
    
    const [statsResult, categoryStatsResult, monthlyStatsResult] = await Promise.all([
      db.query(statsQuery),
      db.query(categoryStatsQuery),
      db.query(monthlyStatsQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        general: statsResult.rows[0],
        by_category: categoryStatsResult.rows,
        monthly: monthlyStatsResult.rows
      }
    });
    
  } catch (error) {
    console.error('İşlem istatistikleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem istatistikleri getirilirken hata oluştu'
    });
  }
};

// İşlem durumunu güncelle (Admin)
const updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['completed', 'pending', 'failed', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum değeri'
      });
    }
    
    const query = `
      UPDATE transactions 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İşlem bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'İşlem durumu güncellendi',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('İşlem durumu güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem durumu güncellenirken hata oluştu'
    });
  }
};

module.exports = {
  requireAdmin,
  getAllTransactions,
  getTransactionById,
  getTransactionStats,
  updateTransactionStatus
};