const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getUserListings, getUserListingsByType, deleteListing } = require('../controllers/userListingsController');

// Kullanıcının tüm ilanlarını getir (watch, car, housing)
router.get('/my-listings', authenticateToken, getUserListings);

// Kullanıcının belirli tip ilanlarını getir
router.get('/my-listings/:type', authenticateToken, getUserListingsByType);

// İlan silme
router.delete('/:listingId', authenticateToken, deleteListing);

module.exports = router;