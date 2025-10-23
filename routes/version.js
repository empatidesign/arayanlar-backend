const express = require('express');
const router = express.Router();
const versionController = require('../controllers/versionController');

// Versiyon bilgilerini getir
router.get('/info', versionController.getVersionInfo);

// Versiyon kontrolü yap
router.post('/check', versionController.checkVersion);

module.exports = router;