const db = require('../services/database');

// Kullanıcının işlemlerini getir
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Base query
    let query = `
      SELECT 
        id,
        listing_id,
        listing_title,
        listing_type,
        transaction_type,
        amount,
        payment_date,
        extension_days,
        old_expiry_date,
        new_expiry_date,
        status,
        payment_method,
        payment_reference
      FROM transactions 
      WHERE user_id = $1
    `;
    
    let queryParams = [userId];
    let paramIndex = 2;
    
    // Opsiyonel filtreleme
    if (type && ['car', 'watch', 'housing'].includes(type)) {
      query += ` AND listing_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }
    
    // Sıralama ve sayfalama
    query += ` ORDER BY payment_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await db.query(query, queryParams);
    
    // Toplam kayıt sayısını al
    let countQuery = 'SELECT COUNT(*) FROM transactions WHERE user_id = $1';
    let countParams = [userId];
    
    if (type && ['car', 'watch', 'housing'].includes(type)) {
      countQuery += ' AND listing_type = $2';
      countParams.push(type);
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
        hasNextPage: (page * limit) < totalCount,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('İşlemler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İşlemler getirilirken bir hata oluştu'
    });
  }
};

// Belirli bir işlemin detaylarını getir
const getTransactionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;

    const query = `
      SELECT 
        t.*,
        u.name as user_name,
        u.email as user_email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1 AND t.user_id = $2
    `;

    const result = await db.query(query, [transactionId, userId]);

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
      message: 'İşlem detayları getirilirken bir hata oluştu'
    });
  }
};

// İşlem istatistiklerini getir
const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN transaction_type = 'extension' THEN 1 END) as extension_count,
        SUM(CASE WHEN transaction_type = 'extension' THEN amount ELSE 0 END) as extension_amount,
        COUNT(CASE WHEN listing_type = 'car' THEN 1 END) as car_transactions,
        COUNT(CASE WHEN listing_type = 'watch' THEN 1 END) as watch_transactions,
        COUNT(CASE WHEN listing_type = 'housing' THEN 1 END) as housing_transactions
      FROM transactions 
      WHERE user_id = $1 AND status = 'completed'
    `;

    const result = await db.query(query, [userId]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('İşlem istatistikleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem istatistikleri getirilirken bir hata oluştu'
    });
  }
};

module.exports = {
  getUserTransactions,
  getTransactionDetails,
  getTransactionStats
};