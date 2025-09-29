const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllSliders,
  getSliderById,
  createSlider,
  updateSlider,
  deleteSlider,
  updateSliderOrder,
  upload
} = require('../controllers/slidersController');

// Public routes
router.get('/', getAllSliders);
router.get('/:id', getSliderById);

// Protected routes (admin only)
router.post('/', authenticateToken, upload.single('image'), createSlider);
router.put('/order', authenticateToken, updateSliderOrder);
router.put('/:id', authenticateToken, upload.single('image'), updateSlider);
router.delete('/:id', authenticateToken, deleteSlider);

module.exports = router;