const db = require('../services/database');

// Tüm kategorileri getir
const getAllSections = async (req, res) => {
  try {
    const query = 'SELECT * FROM sections ORDER BY name ASC';
    const result = await db.query(query);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Kategoriler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilirken hata oluştu'
    });
  }
};

// Belirli bir kategoriyi getir
const getSectionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM sections WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Kategori getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori getirilirken hata oluştu'
    });
  }
};

module.exports = {
  getAllSections,
  getSectionById
};
