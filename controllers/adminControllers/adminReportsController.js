const db = require('../../services/database');

// Admin - Şikayet gönder
const submitReport = async (req, res) => {
  try {
    const { 
      reporter_user_id, 
      reported_user_id, 
      category, 
      description, 
      chat_context 
    } = req.body;

    // Gerekli alanları kontrol et
    if (!reporter_user_id || !reported_user_id || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Gerekli alanlar eksik'
      });
    }

    // Aynı kullanıcının aynı kullanıcıyı tekrar şikayet etmesini engelle (son 24 saat içinde)
    const existingReportQuery = `
      SELECT id FROM reports 
      WHERE reporter_user_id = $1 AND reported_user_id = $2 
      AND created_at > NOW() - INTERVAL '24 hours'
    `;
    
    const existingReport = await db.query(existingReportQuery, [reporter_user_id, reported_user_id]);
    
    if (existingReport.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcıyı son 24 saat içinde zaten şikayet ettiniz'
      });
    }

    const query = `
      INSERT INTO reports (
        reporter_user_id, 
        reported_user_id, 
        category, 
        description, 
        chat_context,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      RETURNING id
    `;

    const values = [
      reporter_user_id,
      reported_user_id,
      category,
      description,
      chat_context ? JSON.stringify(chat_context) : '{}'
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Şikayet başarıyla gönderildi',
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    console.error('Şikayet gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayet gönderilirken bir hata oluştu'
    });
  }
};

// Admin - Tüm şikayetleri listele
const getReports = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtreleme koşulları
    if (status) {
      whereConditions.push(`r.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`r.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        reporter.name ILIKE $${paramIndex} OR 
        reporter.surname ILIKE $${paramIndex} OR 
        reported.name ILIKE $${paramIndex} OR 
        reported.surname ILIKE $${paramIndex} OR
        r.description ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Toplam kayıt sayısı
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reports r
      LEFT JOIN users reporter ON r.reporter_user_id = reporter.id
      LEFT JOIN users reported ON r.reported_user_id = reported.id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Şikayetleri getir
    const query = `
      SELECT 
        r.id,
        r.reporter_user_id,
        r.reported_user_id,
        r.category,
        r.description,
        r.status,
        r.admin_notes,
        r.chat_context,
        r.created_at,
        r.updated_at,
        reporter.name as reporter_name,
        reporter.surname as reporter_surname,
        reporter.email as reporter_email,
        reported.name as reported_name,
        reported.surname as reported_surname,
        reported.email as reported_email
      FROM reports r
      LEFT JOIN users reporter ON r.reporter_user_id = reporter.id
      LEFT JOIN users reported ON r.reported_user_id = reported.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await db.query(query, queryParams);

    res.json({
      success: true,
      data: {
        reports: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_items: total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Şikayetleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayetler getirilirken bir hata oluştu'
    });
  }
};

// Admin - Şikayet detayını getir
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        r.id,
        r.reporter_user_id,
        r.reported_user_id,
        r.category,
        r.description,
        r.status,
        r.admin_notes,
        r.chat_context,
        r.created_at,
        r.updated_at,
        reporter.name as reporter_name,
        reporter.surname as reporter_surname,
        reporter.email as reporter_email,
        reporter.phone as reporter_phone,
        reported.name as reported_name,
        reported.surname as reported_surname,
        reported.email as reported_email,
        reported.phone as reported_phone
      FROM reports r
      LEFT JOIN users reporter ON r.reporter_user_id = reporter.id
      LEFT JOIN users reported ON r.reported_user_id = reported.id
      WHERE r.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şikayet bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Şikayet detayı getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayet detayı getirilirken bir hata oluştu'
    });
  }
};

// Admin - Şikayet için sohbet mesajlarını getir
const getReportChatMessages = async (req, res) => {
  try {
    const { id } = req.params;

    // Önce şikayetin var olduğunu ve kullanıcı ID'lerini kontrol et
    const reportQuery = `
      SELECT reporter_user_id, reported_user_id 
      FROM reports 
      WHERE id = $1
    `;
    
    const reportResult = await db.query(reportQuery, [id]);
    
    if (reportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şikayet bulunamadı'
      });
    }

    const { reporter_user_id, reported_user_id } = reportResult.rows[0];

    // İki kullanıcı arasındaki sohbet mesajlarını getir (son 50 mesaj)
    const messagesQuery = `
      SELECT 
        m.id,
        m.sender_id,
        m.message,
        m.message_type,
        m.caption,
        m.created_at,
        cp1.user_id as receiver_id
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id != m.sender_id
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = m.sender_id
      WHERE 
        (cp1.user_id = $1 AND cp2.user_id = $2) OR 
        (cp1.user_id = $2 AND cp2.user_id = $1)
      ORDER BY m.created_at DESC
      LIMIT 50
    `;

    const messagesResult = await db.query(messagesQuery, [reporter_user_id, reported_user_id]);

    res.json({
      success: true,
      data: messagesResult.rows
    });

  } catch (error) {
    console.error('Şikayet sohbet mesajları getirme hatası:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Sohbet mesajları getirilirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin - Şikayet durumu güncelleme
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    // Geçerli durumları kontrol et
    const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum değeri'
      });
    }

    const query = `
      UPDATE reports 
      SET status = $1, admin_notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id
    `;

    const result = await db.query(query, [status, admin_notes || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şikayet bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Şikayet durumu başarıyla güncellendi'
    });

  } catch (error) {
    console.error('Şikayet durumu güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayet durumu güncellenirken bir hata oluştu'
    });
  }
};

// Admin - Şikayet silme
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM reports WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şikayet bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Şikayet başarıyla silindi'
    });

  } catch (error) {
    console.error('Şikayet silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayet silinirken bir hata oluştu'
    });
  }
};

module.exports = {
  submitReport,
  getReports,
  getReportById,
  getReportChatMessages,
  updateReportStatus,
  deleteReport
};