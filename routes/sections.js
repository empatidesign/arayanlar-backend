const express = require('express');
const router = express.Router();
const {
  getAllSections,
  getSectionById
} = require('../controllers/sectionsController');

// Tüm kategorileri getir (public - mobile app için)
router.get('/', getAllSections);

// Belirli bir kategoriyi getir (public - mobile app için)
router.get('/:id', getSectionById);

module.exports = router;
