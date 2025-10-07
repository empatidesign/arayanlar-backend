const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const {
  requireAdmin
} = require('../controllers/adminController');
const {
  approveWatchListing,
  rejectWatchListing,
  getPendingWatchListings
} = require('../controllers/watchController');

// Watch listings admin routes
router.get('/watch-listings/pending', adminLimiter, auth, requireAdmin, getPendingWatchListings);
router.put('/watch-listings/:id/approve', adminLimiter, auth, requireAdmin, approveWatchListing);
router.put('/watch-listings/:id/reject', adminLimiter, auth, requireAdmin, rejectWatchListing);

module.exports = router;
