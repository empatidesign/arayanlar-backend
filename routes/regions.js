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
router.get('/countries', authenticateToken, getAllCountries);
router.get('/countries/:id', authenticateToken, getCountryById);
router.post('/countries', adminLimiter, authenticateToken, requireAdmin, createCountry);

// Şehirler
router.get('/cities', authenticateToken, getAllCities);
router.get('/cities/:id', authenticateToken, getCityById);
router.post('/cities', adminLimiter, authenticateToken, requireAdmin, createCity);

// İlçeler
router.get('/districts', authenticateToken, getAllDistricts);
router.get('/districts/:id', authenticateToken, getDistrictById);
router.post('/districts', adminLimiter, authenticateToken, requireAdmin, createDistrict);

module.exports = router;
