const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');

// Watch controller'dan mobile fonksiyonları import et
const { 
  createMobileListing, 
  getMobileListings, 
  getMobileListingById 
} = require('../controllers/watchController');

// Car controller'dan mobile fonksiyonları import et
const { getCarListings, getCarBrands } = require('../controllers/carsController');

// Watch listings endpoints
router.post('/listings', createMobileListing);
router.get('/listings', getMobileListings);
router.get('/listings/:id', getMobileListingById);

// Car listings endpoints
router.get('/cars/listings', getCarListings);

// Car brands endpoint for mobile
router.get('/cars/brands', getCarBrands);

module.exports = router;