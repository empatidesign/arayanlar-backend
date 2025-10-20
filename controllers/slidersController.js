const db = require('../services/database');

// Tüm slider'ları getir - mobile app için
const getAllSliders = async (req, res) => {
  try {
    const query = 'SELECT * FROM sliders ORDER BY order_index ASC, created_at DESC';
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Slider\'lar getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Slider\'lar getirilirken hata oluştu'
    });
  }
};

// Tek slider getir - mobile app için
const getSliderById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM sliders WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Slider getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Slider getirilirken hata oluştu'
    });
  }
};

module.exports = {
  getAllSliders,
  getSliderById
};