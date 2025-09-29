const express = require('express');
const router = express.Router();
const {
  upload,
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand
} = require('../controllers/brandsController');

// Tüm markaları getir
router.get('/', getAllBrands);

// Belirli bir markayı getir
router.get('/:id', getBrandById);

// Yeni marka ekle
router.post('/', upload.single('image'), createBrand);

// Marka güncelle
router.put('/:id', upload.single('image'), updateBrand);

// Marka sil
router.delete('/:id', deleteBrand);

module.exports = router;