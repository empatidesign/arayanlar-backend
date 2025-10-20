const express = require('express');
const router = express.Router();
const db = require('../services/database');
const { authenticateToken } = require('../middleware/auth');

// Tüm kategorileri getir (token gerekli)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM sections ORDER BY name ASC');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Kategoriler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilirken hata oluştu'
    });
  }
});

// Tek kategori getir (token gerekli)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('SELECT * FROM sections WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Kategori getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori getirilirken hata oluştu'
    });
  }
});

module.exports = router;