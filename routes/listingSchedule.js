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

// Şu anki durumu kontrol et (herkese açık)
router.get('/availability', checkListingAvailability);

// Kalan süreyi getir (herkese açık)
router.get('/remaining-time', getRemainingTime);

module.exports = router;