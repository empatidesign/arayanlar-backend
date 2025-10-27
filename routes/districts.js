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

// Admin - İlçe sıralama fonksiyonu adminControllers altında
const { updateDistrictOrder } = require('../controllers/adminControllers/adminHouseController');

// Admin kontrolü
const { requireAdmin } = require('../controllers/adminController');

// Tüm ilçeleri getir (token gerekli)
router.get('/', auth, getDistricts);

// İstanbul ilçelerini getir (token gerekli)
router.get('/istanbul', auth, getIstanbulDistricts);

// İlçe ara (token gerekli)
router.get('/search', auth, searchDistricts);

// Admin - İlçe sıralamasını güncelle (parametreli rotalardan ÖNCE olmalı)
router.put('/order', auth, requireAdmin, updateDistrictOrder);

// Belirli bir ilçeyi getir (token gerekli)
router.get('/:id', auth, getDistrictById);

// Admin routes - ilçe yönetimi
router.post('/', auth, upload.single('image'), createDistrict);
router.put('/:id', auth, upload.single('image'), updateDistrict);
router.delete('/:id', auth, deleteDistrict);

module.exports = router;