const db = require('../services/database');

// Mobil uygulama - Şikayet gönder
const submitReport = async (req, res) => {
  try {
    const { 
      reported_user_id, 
      category, 
      description, 
      chat_context 
    } = req.body;

    // Token'dan reporter_user_id'yi al
    const reporter_user_id = req.user.id;

    // Gerekli alanları kontrol et
    if (!reported_user_id || !category || !description) {
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
      chat_context || '{}'
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Şikayet başarıyla gönderildi',
      reportId: result.rows[0].id
    });

  } catch (error) {
    console.error('Şikayet gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayet gönderilirken bir hata oluştu'
    });
  }
};

module.exports = {
  submitReport
};