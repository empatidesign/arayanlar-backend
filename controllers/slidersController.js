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

// Slider sıralarını güncelle
const updateSliderOrder = async (req, res) => {
  try {
    const { orders } = req.body; // [{ id: 1, order_index: 2 }, { id: 2, order_index: 1 }]
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sıra verisi'
      });
    }

    // Transaction başlat
    await db.query('BEGIN');
    
    try {
      for (const order of orders) {
        const query = 'UPDATE sliders SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
        await db.query(query, [order.order_index, order.id]);
      }
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Slider sıraları başarıyla güncellendi'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Slider sıraları güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Slider sıraları güncellenirken hata oluştu'
    });
  }
};

module.exports = {
  getAllSliders,
  getSliderById,
  updateSliderOrder
};