const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../controllers/adminController');
const listingLimitScheduler = require('../services/listingLimitScheduler');
const {
  getListingLimit,
  updateListingLimit,
  getUserDailyCount,
  getAllUsersDailyCount,
  resetDailyCounts,
  resetUserCount
} = require('../controllers/listingLimitsController');

// Mevcut ilan limitini getir (admin)
router.get('/admin/limit', authenticateToken, requireAdmin, getListingLimit);

// İlan limitini güncelle (admin)
router.put('/admin/limit', authenticateToken, requireAdmin, updateListingLimit);

// Tüm kullanıcıların günlük ilan sayılarını getir (admin)
router.get('/admin/users-count', authenticateToken, requireAdmin, getAllUsersDailyCount);

// Günlük sayaçları sıfırla (admin)
router.post('/admin/reset-counts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await resetDailyCounts(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Sayaçlar sıfırlanırken hata oluştu' });
  }
});

// Scheduler durumunu getir (admin)
router.get('/admin/scheduler-status', authenticateToken, requireAdmin, (req, res) => {
  const status = listingLimitScheduler.getStatus();
  res.json({ success: true, data: status });
});

// Belirli kullanıcının sayacını sıfırla (admin)
router.post('/admin/reset-user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await listingLimitScheduler.resetUserCount(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kullanıcının günlük ilan sayısını getir (kullanıcı kendi bilgisini görebilir)
router.get('/my-count', authenticateToken, getUserDailyCount);

module.exports = router;