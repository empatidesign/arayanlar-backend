const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getListingSchedule,
  updateListingSchedule,
  checkListingAvailability,
  getRemainingTime
} = require('../controllers/listingScheduleController');

// İlan verme saatlerini getir (admin)
router.get('/admin/schedule', authenticateToken, requireAdmin, getListingSchedule);

// İlan verme saatlerini güncelle (admin)
router.put('/admin/schedule', authenticateToken, requireAdmin, updateListingSchedule);

// Şu anki durumu kontrol et (token gerekli)
router.get('/availability', authenticateToken, checkListingAvailability);

// Kalan süreyi getir (token gerekli)
router.get('/remaining-time', authenticateToken, getRemainingTime);

module.exports = router;