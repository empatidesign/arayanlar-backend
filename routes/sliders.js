const express = require('express');
const router = express.Router();
const {
  getAllSliders,
  getSliderById
} = require('../controllers/slidersController');

// Public routes - mobile app için
router.get('/', getAllSliders);
router.get('/:id', getSliderById);

module.exports = router;