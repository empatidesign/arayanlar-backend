const express = require('express');
const router = express.Router();
const {
  upload,
  getAllSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection
} = require('../controllers/sectionsController');

// Tüm kategorileri getir
router.get('/', getAllSections);

// Belirli bir kategoriyi getir
router.get('/:id', getSectionById);

// Yeni kategori ekle
router.post('/', upload.single('image'), createSection);

// Kategori güncelle
router.put('/:id', upload.single('image'), updateSection);

// Kategori sil
router.delete('/:id', deleteSection);

module.exports = router;
