const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkListingScheduleWithAdminBypass } = require('../middleware/listingSchedule');
const { checkListingLimitWithAdminBypass, incrementListingCount } = require('../middleware/listingLimit');

// Public watch functions from watchController
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

// Admin functions from adminWatchController
const {
  getWatchBrandsForAdmin,
  createWatchBrand,
  updateWatchBrand,
  deleteWatchBrand,
  watchBrandUpload,
  getAllWatchModels,
  createWatchModel,
  updateWatchModel,
  deleteWatchModel,
  toggleWatchModelStatus,
  watchModelUpload,
  getAllWatchListingsForAdmin,
  getPendingWatchListings,
  approveWatchListing,
  rejectWatchListing,
  deleteWatchListingByAdmin,
  extendWatchListingDuration
} = require('../controllers/adminControllers/adminWatchController');

// requireAdmin middleware from adminController
const { requireAdmin } = require('../controllers/adminController');

// Saat markalarını listele (token gerekli)
router.get('/brands', authenticateToken, getWatchBrands);

// Admin - Saat markalarını listele (admin only)
router.get('/admin/brands', authenticateToken, requireAdmin, getWatchBrandsForAdmin);

// Admin - Saat markası oluştur
router.post('/brands', authenticateToken, requireAdmin, watchBrandUpload.single('logo'), createWatchBrand);

// Admin - Saat markası güncelle
router.put('/brands/:id', authenticateToken, requireAdmin, watchBrandUpload.single('logo'), updateWatchBrand);

// Admin - Saat markası sil
router.delete('/brands/:id', authenticateToken, requireAdmin, deleteWatchBrand);

// Popüler saat markalarını listele (token gerekli)
router.get('/brands/popular', authenticateToken, getPopularWatchBrands);

// Markaya göre saat ürünlerini listele (token gerekli)
router.get('/brands/:brandId/products', authenticateToken, getWatchProductsByBrand);

// Admin - Saat modellerini listele (admin only)
router.get('/models', authenticateToken, requireAdmin, getAllWatchModels);

// Admin - Saat modeli oluştur
router.post('/models', authenticateToken, requireAdmin, watchModelUpload, createWatchModel);

// Admin - Saat modeli güncelle
router.put('/models/:id', authenticateToken, requireAdmin, watchModelUpload, updateWatchModel);

// Admin - Saat modeli sil
router.delete('/models/:id', authenticateToken, requireAdmin, deleteWatchModel);

// Admin - Saat modeli durumunu değiştir
router.patch('/models/:id/toggle-status', authenticateToken, requireAdmin, toggleWatchModelStatus);

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

// Saat ürün detaylarını getir (token gerekli)
router.get('/products/:productId', authenticateToken, getWatchProductDetails);

// Ürün renklerini getir (token gerekli)
router.get('/product-colors/:productId', authenticateToken, getProductColors);

// Renk resimlerini getir (token gerekli)
router.get('/colors/:colorId/images', authenticateToken, getColorImages);

// Saat arama (token gerekli)
router.get('/search', authenticateToken, searchWatches);

// Saat ilanlarını listele (token gerekli)
router.get('/listings', authenticateToken, getMobileListings);

// Mobile listings - Tek ilan detayı getir
// Mobile listings endpoints (kimlik doğrulaması gerekli - satıcı bilgileri koruması)
router.get('/listings/:id', authenticateToken, getMobileListingById);

// Mobile listings - İlan oluştur (kimlik doğrulaması, zaman kontrolü ve limit kontrolü gerekli)
router.post('/listings', authenticateToken, checkListingScheduleWithAdminBypass, checkListingLimitWithAdminBypass, incrementListingCount, createMobileListing);

// Admin - Saat ilanlarını listele
router.get('/admin/listings', authenticateToken, requireAdmin, getAllWatchListingsForAdmin);

// Admin - Bekleyen saat ilanlarını listele
router.get('/admin/listings/pending', authenticateToken, requireAdmin, getPendingWatchListings);

// Admin - Saat ilanını onayla
router.patch('/admin/listings/:id/approve', authenticateToken, requireAdmin, approveWatchListing);

// Admin - Saat ilanını reddet
router.patch('/admin/listings/:id/reject', authenticateToken, requireAdmin, rejectWatchListing);

// Admin - Saat ilanı süresini uzat
router.patch('/admin/listings/:id/extend-duration', authenticateToken, requireAdmin, extendWatchListingDuration);

// Admin - Saat ilanını sil
router.delete('/admin/listings/:id', authenticateToken, requireAdmin, deleteWatchListingByAdmin);

module.exports = router;