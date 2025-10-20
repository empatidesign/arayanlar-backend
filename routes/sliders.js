const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllSliders,
  getSliderById
} = require('../controllers/slidersController');

// Slider'ları getir (token gerekli)
router.get('/', authenticateToken, getAllSliders);
router.get('/:id', authenticateToken, getSliderById);

module.exports = router;