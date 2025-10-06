const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const housingController = require('../controllers/housingController');

const {
  createHousingListing,
  getHousingListings,
  getHousingListingById,
  updateHousingListing,
  deleteHousingListing,
  approveHousingListing,
  rejectHousingListing,
  getPendingHousingListings
} = housingController;

// Konut ilanı oluştur (kimlik doğrulaması gerekli)
router.post('/create-listing', authenticateToken, createHousingListing);

// Konut ilanlarını getir
router.get('/listings', getHousingListings);

// Konut ilanı detayını getir
router.get('/listings/:id', getHousingListingById);

// Konut ilanını güncelle (kimlik doğrulaması gerekli)
router.put('/listings/:id', authenticateToken, updateHousingListing);

// Konut ilanını sil (kimlik doğrulaması gerekli)
router.delete('/listings/:id', authenticateToken, deleteHousingListing);

// Admin routes - konut ilanları yönetimi
router.get('/admin/listings/pending', authenticateToken, getPendingHousingListings);
router.patch('/admin/listings/:id/approve', authenticateToken, approveHousingListing);
router.patch('/admin/listings/:id/reject', authenticateToken, rejectHousingListing);

module.exports = router;