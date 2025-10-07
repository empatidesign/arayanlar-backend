const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkListingScheduleWithAdminBypass } = require('../middleware/listingSchedule');
const { checkListingLimitWithAdminBypass, incrementListingCount } = require('../middleware/listingLimit');
const housingController = require('../controllers/housingController');

const {
  createHousingListing,
  getHousingListings,
  getAllHousingListingsForAdmin,
  getHousingListingById,
  updateHousingListing,
  deleteHousingListing,
  deleteHousingListingByAdmin,
  approveHousingListing,
  rejectHousingListing,
  cancelHousingListing,
  reapproveHousingListing,
  getPendingHousingListings
} = housingController;

// Konut ilanı oluştur (kimlik doğrulaması, zaman kontrolü ve limit kontrolü gerekli)
router.post('/create-listing', authenticateToken, checkListingScheduleWithAdminBypass, checkListingLimitWithAdminBypass, incrementListingCount, createHousingListing);

// Konut ilanlarını getir
router.get('/listings', getHousingListings);

// Konut ilanı detayını getir
router.get('/listings/:id', getHousingListingById);

// Konut ilanını güncelle (kimlik doğrulaması gerekli)
router.put('/listings/:id', authenticateToken, updateHousingListing);

// Konut ilanını sil (kimlik doğrulaması gerekli)
router.delete('/listings/:id', authenticateToken, deleteHousingListing);

// Admin routes - konut ilanları yönetimi
router.get('/admin/listings', authenticateToken, getAllHousingListingsForAdmin);
router.get('/admin/listings/pending', authenticateToken, getPendingHousingListings);
router.patch('/admin/listings/:id/approve', authenticateToken, approveHousingListing);
router.patch('/admin/listings/:id/reject', authenticateToken, rejectHousingListing);
router.patch('/admin/listings/:id/cancel', authenticateToken, cancelHousingListing);
router.patch('/admin/listings/:id/reapprove', authenticateToken, reapproveHousingListing);
router.delete('/admin/listings/:id', authenticateToken, deleteHousingListingByAdmin);

module.exports = router;