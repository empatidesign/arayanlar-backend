const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkListingScheduleWithAdminBypass } = require('../middleware/listingSchedule');
const { checkListingLimitWithAdminBypass, incrementListingCount } = require('../middleware/listingLimit');
const housingController = require('../controllers/housingController');
const adminHouseController = require('../controllers/adminControllers/adminHouseController');

const {
  createHousingListing,
  getHousingListings,
  deleteHousingListing
} = housingController;

const {
  requireAdmin,
  getAllHousingListingsForAdmin,
  getPendingHousingListings,
  approveHousingListing,
  rejectHousingListing,
  cancelHousingListing,
  reapproveHousingListing,
  deleteHousingListingByAdmin,
  getHousingListingById,
  updateHousingListing,
  extendHousingListingDuration
} = adminHouseController;

// Konut ilanı oluştur (kimlik doğrulaması, zaman kontrolü ve limit kontrolü gerekli)
router.post('/create-listing', authenticateToken, checkListingScheduleWithAdminBypass, checkListingLimitWithAdminBypass, incrementListingCount, createHousingListing);

// Konut ilanlarını getir
router.get('/listings', getHousingListings);

// Konut ilanı detayını getir (admin yetkisi gerekli)
router.get('/listings/:id', authenticateToken, requireAdmin, getHousingListingById);

// Konut ilanını güncelle (admin yetkisi gerekli)
router.put('/listings/:id', authenticateToken, requireAdmin, updateHousingListing);

// Konut ilanını sil (kimlik doğrulaması gerekli)
router.delete('/listings/:id', authenticateToken, deleteHousingListing);

// Admin routes - konut ilanları yönetimi
router.get('/admin/listings', authenticateToken, requireAdmin, getAllHousingListingsForAdmin);
router.get('/admin/listings/pending', authenticateToken, requireAdmin, getPendingHousingListings);
router.patch('/admin/listings/:id/approve', authenticateToken, requireAdmin, approveHousingListing);
router.patch('/admin/listings/:id/reject', authenticateToken, requireAdmin, rejectHousingListing);
router.patch('/admin/listings/:id/cancel', authenticateToken, requireAdmin, cancelHousingListing);
router.patch('/admin/listings/:id/reapprove', authenticateToken, requireAdmin, reapproveHousingListing);
router.patch('/admin/listings/:id/extend-duration', authenticateToken, requireAdmin, extendHousingListingDuration);
router.delete('/admin/listings/:id', authenticateToken, requireAdmin, deleteHousingListingByAdmin);

module.exports = router;