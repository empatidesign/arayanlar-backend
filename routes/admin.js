const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const {
  requireAdmin
} = require('../controllers/adminController');

module.exports = router;
