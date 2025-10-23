const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllSliders,
  getSliderById,
  updateSliderOrder
} = require('../controllers/slidersController');

// Slider'ları getir (token gerekli)
router.get('/', authenticateToken, getAllSliders);
router.get('/:id', authenticateToken, getSliderById);

// Slider sıralarını güncelle (token gerekli)
router.put('/order', authenticateToken, updateSliderOrder);

module.exports = router;