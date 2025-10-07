const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkListingScheduleWithAdminBypass } = require('../middleware/listingSchedule');
const { checkListingLimitWithAdminBypass, incrementListingCount } = require('../middleware/listingLimit');
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
  deleteWatchListingByAdmin,
  upload,
  modelUpload
} = require('../controllers/watchController');

// Saat markalarını listele
router.get('/brands', getWatchBrands);

// Admin - Saat markası oluştur
router.post('/brands', authenticateToken, upload.single('logo'), createWatchBrand);

// Admin - Saat markası güncelle
router.put('/brands/:id', authenticateToken, upload.single('logo'), updateWatchBrand);

// Admin - Saat markası sil
router.delete('/brands/:id', authenticateToken, deleteWatchBrand);

// Popüler saat markalarını getir
router.get('/brands/popular', getPopularWatchBrands);

// Markaya göre saat ürünlerini listele
router.get('/brands/:brandId/products', getWatchProductsByBrand);

// Tüm saat modellerini listele (Admin)
router.get('/models', authenticateToken, getAllWatchModels);

// Admin - Saat modeli oluştur
router.post('/models', authenticateToken, modelUpload, createWatchModel);

// Admin - Saat modeli güncelle
router.put('/models/:id', authenticateToken, modelUpload, updateWatchModel);

// Admin - Saat modeli sil
router.delete('/models/:id', authenticateToken, deleteWatchModel);

// Admin - Saat modeli durumunu değiştir
router.patch('/models/:id/toggle-status', authenticateToken, toggleWatchModelStatus);

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

// Mobile listings - İlan oluştur (kimlik doğrulaması, zaman kontrolü ve limit kontrolü gerekli)
router.post('/listings', authenticateToken, checkListingScheduleWithAdminBypass, checkListingLimitWithAdminBypass, incrementListingCount, createMobileListing);

// Admin - Tüm saat ilanlarını getir
router.get('/admin/listings', authenticateToken, getAllWatchListingsForAdmin);

// Admin - Saat ilanını onayla
router.patch('/admin/listings/:id/approve', authenticateToken, approveWatchListing);

// Admin - Saat ilanını reddet
router.patch('/admin/listings/:id/reject', authenticateToken, rejectWatchListing);

// Admin - Saat ilanını sil
router.delete('/admin/listings/:id', authenticateToken, deleteWatchListingByAdmin);

module.exports = router;