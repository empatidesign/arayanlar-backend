const db = require('../services/database');

// Tüm içerikleri getir (public)
const getAllContent = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, key, title, content, is_active FROM app_content WHERE is_active = true ORDER BY key'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get all content error:', error);
    res.status(500).json({
      success: false,
      message: 'İçerikler getirilirken hata oluştu'
    });
  }
};

// Belirli bir içeriği getir (public)
const getContentByKey = async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await db.query(
      'SELECT id, key, title, content, is_active FROM app_content WHERE key = $1 AND is_active = true',
      [key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İçerik bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get content by key error:', error);
    res.status(500).json({
      success: false,
      message: 'İçerik getirilirken hata oluştu'
    });
  }
};

// Admin: Tüm içerikleri getir
const adminGetAllContent = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM app_content ORDER BY key'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Admin get all content error:', error);
    res.status(500).json({
      success: false,
      message: 'İçerikler getirilirken hata oluştu'
    });
  }
};

// Admin: İçerik güncelle
const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, is_active } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve içerik gereklidir'
      });
    }
    
    const result = await db.query(
      `UPDATE app_content 
       SET title = $1, content = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [title, content, is_active !== undefined ? is_active : true, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İçerik bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'İçerik başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      success: false,
      message: 'İçerik güncellenirken hata oluştu'
    });
  }
};

// Admin: Yeni içerik oluştur
const createContent = async (req, res) => {
  try {
    const { key, title, content, is_active } = req.body;
    
    if (!key || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Key, başlık ve içerik gereklidir'
      });
    }
    
    const result = await db.query(
      `INSERT INTO app_content (key, title, content, is_active) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [key, title, content, is_active !== undefined ? is_active : true]
    );
    
    res.status(201).json({
      success: true,
      message: 'İçerik başarıyla oluşturuldu',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Bu key zaten kullanılıyor'
      });
    }
    
    console.error('Create content error:', error);
    res.status(500).json({
      success: false,
      message: 'İçerik oluşturulurken hata oluştu'
    });
  }
};

// Admin: İçerik sil
const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM app_content WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İçerik bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'İçerik başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({
      success: false,
      message: 'İçerik silinirken hata oluştu'
    });
  }
};

module.exports = {
  getAllContent,
  getContentByKey,
  adminGetAllContent,
  updateContent,
  createContent,
  deleteContent
};
