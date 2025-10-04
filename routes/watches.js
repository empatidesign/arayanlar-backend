const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
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
  getMobileListingById,
  // Admin yönetimi fonksiyonları
  createWatchBrand,
  updateWatchBrand,
  deleteWatchBrand,
  getAllWatchModels,
  createWatchModel,
  updateWatchModel,
  deleteWatchModel,
  toggleWatchModelStatus,
  getAllWatchListingsForAdmin,
  approveWatchListing,
  rejectWatchListing,
  upload,
  modelUpload
} = require('../controllers/watchController');

// Saat markalarını listele
router.get('/brands', getWatchBrands);

// Admin - Saat markası oluştur
router.post('/brands', upload.single('logo'), createWatchBrand);

// Admin - Saat markası güncelle
router.put('/brands/:id', upload.single('logo'), updateWatchBrand);

// Admin - Saat markası sil
router.delete('/brands/:id', deleteWatchBrand);

// Popüler saat markalarını getir
router.get('/brands/popular', getPopularWatchBrands);

// Markaya göre saat ürünlerini listele
router.get('/brands/:brandId/products', getWatchProductsByBrand);

// Tüm saat modellerini listele (Admin)
router.get('/models', getAllWatchModels);

// Admin - Saat modeli oluştur
router.post('/models', modelUpload, createWatchModel);

// Admin - Saat modeli güncelle
router.put('/models/:id', modelUpload, updateWatchModel);

// Admin - Saat modeli sil
router.delete('/models/:id', deleteWatchModel);

// Admin - Saat modeli durumunu değiştir
router.patch('/models/:id/toggle-status', toggleWatchModelStatus);

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
router.post('/listings', authenticateToken, createMobileListing);

// Admin - Tüm saat ilanlarını getir
router.get('/admin/listings', getAllWatchListingsForAdmin);

// Admin - Saat ilanını onayla
router.patch('/admin/listings/:id/approve', approveWatchListing);

// Admin - Saat ilanını reddet
router.patch('/admin/listings/:id/reject', rejectWatchListing);

module.exports = router;