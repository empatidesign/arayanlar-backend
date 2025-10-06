const express = require('express');
const router = express.Router();
const districtsController = require('../controllers/districtsController');
const { authenticateToken: auth } = require('../middleware/auth');

const {
  upload,
  getDistricts,
  getDistrictById,
  searchDistricts,
  getIstanbulDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict
} = districtsController;

// Tüm ilçeleri getir
router.get('/', getDistricts);

// İstanbul ilçelerini getir (mobil uygulama için)
router.get('/istanbul', getIstanbulDistricts);

// İlçe ara
router.get('/search', searchDistricts);

// Belirli bir ilçeyi getir
router.get('/:id', getDistrictById);

// Admin routes - ilçe yönetimi
router.post('/', auth, upload.single('image'), createDistrict);
router.put('/:id', auth, upload.single('image'), updateDistrict);
router.delete('/:id', auth, deleteDistrict);

module.exports = router;