const express = require('express');
const router = express.Router();
const {
  upload,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productsController');

// Tüm ürünleri getir
router.get('/', getAllProducts);

// Belirli bir ürünü getir
router.get('/:id', getProductById);

// Yeni ürün ekle - çoklu dosya yükleme desteği
router.post('/', upload.any(), createProduct);

// Ürün güncelle - çoklu dosya yükleme desteği
router.put('/:id', upload.any(), updateProduct);

// Ürün sil
router.delete('/:id', deleteProduct);

module.exports = router;
