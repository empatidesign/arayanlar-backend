const express = require('express');
const router = express.Router();
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
router.post('/countries', createCountry);

// Şehirler
router.get('/cities', getAllCities);
router.get('/cities/:id', getCityById);
router.post('/cities', createCity);

// İlçeler
router.get('/districts', getAllDistricts);
router.get('/districts/:id', getDistrictById);
router.post('/districts', createDistrict);

module.exports = router;
