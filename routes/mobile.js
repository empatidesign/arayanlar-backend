const express = require('express');
const router = express.Router();
const { getMobileListings, getMobileListingById, createMobileListing } = require('../controllers/mobileListingsController');
const { authenticateToken: auth } = require('../middleware/auth');
const { upload } = require('../controllers/listingsController');

// Mobile app için ilanlar - sadece onaylanmış
router.get('/listings', getMobileListings);
router.get('/listings/:id', getMobileListingById);
router.post('/listings', auth, upload.array('images', 10), createMobileListing);

module.exports = router;