const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllSections,
  getSectionById
} = require('../controllers/sectionsController');

// Tüm kategorileri getir (token gerekli)
router.get('/', authenticateToken, getAllSections);

// Belirli bir kategoriyi getir (token gerekli)
router.get('/:id', authenticateToken, getSectionById);

module.exports = router;
