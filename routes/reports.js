const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { submitReport } = require('../controllers/reportsController');

// Şikayet gönderme (token gerekli)
router.post('/', authenticateToken, submitReport);

module.exports = router;