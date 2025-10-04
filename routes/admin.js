const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const {
  requireAdmin
} = require('../controllers/adminController');
const {
  approveWatchListing,
  rejectWatchListing,
  getPendingWatchListings
} = require('../controllers/watchController');

// Watch listings admin routes
router.get('/watch-listings/pending', auth, requireAdmin, getPendingWatchListings);
router.put('/watch-listings/:id/approve', auth, requireAdmin, approveWatchListing);
router.put('/watch-listings/:id/reject', auth, requireAdmin, rejectWatchListing);

module.exports = router;
