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

// Tüm versiyonları getir (Admin)
const getAllVersions = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        current_version,
        minimum_version,
        force_update,
        update_message,
        download_url_android,
        download_url_ios,
        is_active,
        created_at,
        updated_at
      FROM app_versions 
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query);
    const versions = result.rows;
    
    res.json({
      success: true,
      data: versions
    });
    
  } catch (error) {
    console.error('Versiyonları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Yeni versiyon oluştur (Admin)
const createVersion = async (req, res) => {
  try {
    const {
      current_version,
      minimum_version,
      force_update,
      update_message,
      download_url_android,
      download_url_ios,
      is_active
    } = req.body;

    // Gerekli alanları kontrol et
    if (!current_version || !minimum_version) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli versiyon ve minimum versiyon gereklidir'
      });
    }

    // Eğer yeni versiyon aktif olarak ayarlanıyorsa, diğer aktif versiyonları pasif yap
    if (is_active) {
      await db.query('UPDATE app_versions SET is_active = false');
    }

    const query = `
      INSERT INTO app_versions (
        current_version,
        minimum_version,
        force_update,
        update_message,
        download_url_android,
        download_url_ios,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `;

    const values = [
      current_version,
      minimum_version,
      force_update || false,
      update_message || '',
      download_url_android || '',
      download_url_ios || '',
      is_active || false
    ];

    const result = await db.query(query, values);
    const newVersionId = result.rows[0].id;

    res.status(201).json({
      success: true,
      message: 'Versiyon başarıyla oluşturuldu',
      data: { id: newVersionId }
    });

  } catch (error) {
    console.error('Versiyon oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Versiyon güncelle (Admin)
const updateVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      current_version,
      minimum_version,
      force_update,
      update_message,
      download_url_android,
      download_url_ios,
      is_active
    } = req.body;

    // Eğer versiyon aktif olarak ayarlanıyorsa, diğer aktif versiyonları pasif yap
    if (is_active) {
      await db.query('UPDATE app_versions SET is_active = false WHERE id != $1', [id]);
    }

    const query = `
      UPDATE app_versions SET
        current_version = $1,
        minimum_version = $2,
        force_update = $3,
        update_message = $4,
        download_url_android = $5,
        download_url_ios = $6,
        is_active = $7,
        updated_at = NOW()
      WHERE id = $8
    `;

    const values = [
      current_version,
      minimum_version,
      force_update,
      update_message,
      download_url_android,
      download_url_ios,
      is_active,
      id
    ];

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versiyon bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Versiyon başarıyla güncellendi'
    });

  } catch (error) {
    console.error('Versiyon güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Versiyon sil (Admin)
const deleteVersion = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM app_versions WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versiyon bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Versiyon başarıyla silindi'
    });

  } catch (error) {
    console.error('Versiyon silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

module.exports = {
  requireAdmin,
  getAllVersions,
  createVersion,
  updateVersion,
  deleteVersion
};