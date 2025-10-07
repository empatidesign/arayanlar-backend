const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const {
  getAllCountries,
  getAllCities,
  getAllDistricts,
  getCountryById,
  getCityById,
  getDistrictById,
  createCountry,
  createCity,
  createDistrict
} = require('../controllers/regionsController');

// Ülkeler
router.get('/countries', getAllCountries);
router.get('/countries/:id', getCountryById);
router.post('/countries', adminLimiter, authenticateToken, requireAdmin, createCountry);

// Şehirler
router.get('/cities', getAllCities);
router.get('/cities/:id', getCityById);
router.post('/cities', adminLimiter, authenticateToken, requireAdmin, createCity);

// İlçeler
router.get('/districts', getAllDistricts);
router.get('/districts/:id', getDistrictById);
router.post('/districts', adminLimiter, authenticateToken, requireAdmin, createDistrict);

module.exports = router;
