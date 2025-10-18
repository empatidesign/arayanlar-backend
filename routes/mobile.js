const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const { checkListingScheduleWithAdminBypass } = require('../middleware/listingSchedule');
const { checkListingLimitWithAdminBypass, incrementListingCount } = require('../middleware/listingLimit');

// Watch controller'dan mobile fonksiyonları import et
const { 
  createMobileListing, 
  getMobileListings, 
  getMobileListingById 
} = require('../controllers/watchController');

// Car controller'dan mobile fonksiyonları import et
const { getCarListings, getCarBrands } = require('../controllers/carsController');

// Housing controller'dan mobile fonksiyonları import et
const { 
  getHousingListings, 
  getHousingListingById 
} = require('../controllers/housingController');

// User listings controller'dan süre uzatma fonksiyonu import et
const { extendListingDuration } = require('../controllers/userListingsController');

// Watch listings endpoints
router.post('/listings', auth, checkListingScheduleWithAdminBypass, checkListingLimitWithAdminBypass, incrementListingCount, createMobileListing);
router.get('/listings', getMobileListings);
router.get('/listings/:id', auth, getMobileListingById);

// Car listings endpoints
router.get('/cars/listings', getCarListings);

// Car brands endpoint for mobile
router.get('/cars/brands', getCarBrands);

// Housing listings endpoints
router.get('/housing/listings', getHousingListings);
router.get('/housing/listings/:id', auth, getHousingListingById);

// İlan süre uzatma endpoint'i
router.post('/listings/extend', auth, extendListingDuration);

module.exports = router;