const express = require('express');
const router = express.Router();
const {
  getProductColors,
  addProductColor,
  updateProductColor,
  deleteProductColor,
  getAllColors
} = require('../controllers/productColorsController');

// Tüm renkleri getir
router.get('/colors', getAllColors);

// Ürün renklerini getir
router.get('/:product_id', getProductColors);

// Ürüne renk ekle
router.post('/:product_id', addProductColor);

// Ürün rengini güncelle
router.put('/:product_id/:color_id', updateProductColor);

// Ürün rengini sil
router.delete('/:product_id/:color_id', deleteProductColor);

module.exports = router;
