const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const {
  requireAdmin,
  getPendingListings,
  approveListing,
  rejectListing,
  bulkApproveListings,
  deleteListing
} = require('../controllers/adminController');

// Bekleyen ilanları listele
router.get('/listings/pending', auth, requireAdmin, getPendingListings);

// İlanı onayla
router.put('/listings/:id/approve', auth, requireAdmin, approveListing);

// İlanı reddet
router.put('/listings/:id/reject', auth, requireAdmin, rejectListing);

// Toplu onaylama
router.put('/listings/bulk-approve', auth, requireAdmin, bulkApproveListings);

// Admin ilan silme
router.delete('/listings/:id', auth, requireAdmin, deleteListing);

module.exports = router;
