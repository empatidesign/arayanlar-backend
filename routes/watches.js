const express = require('express');
const router = express.Router();
const {
  getWatchBrands,
  getWatchProductsByBrand,
  getWatchProductDetails,
  getColorImages,
  getPopularWatchBrands,
  searchWatches,
  getProductColors,
  createMobileListing,
  getMobileListings,
  getMobileListingById
} = require('../controllers/watchController');

// Saat markalarını listele
router.get('/brands', getWatchBrands);

// Popüler saat markalarını getir
router.get('/brands/popular', getPopularWatchBrands);

// Markaya göre saat ürünlerini listele
router.get('/brands/:brandId/products', getWatchProductsByBrand);

// Products endpoint'i için brand_id query parametresi ile
router.get('/', (req, res) => {
  const { brand_id } = req.query;
  if (brand_id) {
    // brand_id parametresini brandId olarak yönlendir
    req.params.brandId = brand_id;
    return getWatchProductsByBrand(req, res);
  }
  res.status(400).json({
    success: false,
    message: 'brand_id parametresi gerekli'
  });
});

// Ürün detayları ve renk seçeneklerini getir
router.get('/products/:productId', getWatchProductDetails);

// Ürün renklerini getir
router.get('/product-colors/:productId', getProductColors);

// Belirli bir rengin resimlerini getir
router.get('/colors/:colorId/images', getColorImages);

// Saat arama
router.get('/search', searchWatches);

// Mobile listings - İlanları getir
router.get('/listings', getMobileListings);

// Mobile listings - Tek ilan detayı getir
router.get('/listings/:id', getMobileListingById);

// Mobile listings - İlan oluştur
router.post('/listings', createMobileListing);

module.exports = router;