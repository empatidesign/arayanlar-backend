const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
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

// Yeni kategori ekle (admin only)
router.post('/', adminLimiter, authenticateToken, requireAdmin, upload.single('image'), createSection);

// Kategori güncelle (admin only)
router.put('/:id', adminLimiter, authenticateToken, requireAdmin, upload.single('image'), updateSection);

// Kategori sil (admin only)
router.delete('/:id', adminLimiter, authenticateToken, requireAdmin, deleteSection);

module.exports = router;
