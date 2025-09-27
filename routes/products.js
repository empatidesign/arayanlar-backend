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

// Yeni ürün ekle
router.post('/', upload.single('image'), createProduct);

// Ürün güncelle
router.put('/:id', upload.single('image'), updateProduct);

// Ürün sil
router.delete('/:id', deleteProduct);

module.exports = router;
