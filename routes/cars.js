const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { checkListingScheduleWithAdminBypass } = require('../middleware/listingSchedule');
const { checkListingLimitWithAdminBypass, incrementListingCount } = require('../middleware/listingLimit');
const carsController = require('../controllers/carsController');
const { 
  getAllCarListingsForAdmin, 
  approveCarListing, 
  rejectCarListing, 
  deleteCarListingByAdmin 
} = require('../controllers/adminCarController');
const {
  getCarBrands,
  getAllCarModels,
  getCarModelsByBrand,
  getEnginesByModel,
  getCarModelDetails,
  getPopularCarBrands,
  createCarListing,
  getCarListingDetail,
  getCarProductColors
} = carsController;

// Araba markalarını listele (public - mobil uygulama için)
router.get('/brands', getCarBrands);

// Popüler araba markalarını getir (public - mobil uygulama için)
router.get('/brands/popular', getPopularCarBrands);

// Markaya göre araba modellerini listele (public - mobil uygulama için)
router.get('/brands/:brandId/models', getCarModelsByBrand);

// Tüm araba modellerini getir (public - mobil uygulama için)
router.get('/models', getAllCarModels);

// Araba modeli detaylarını getir (public - mobil uygulama için)
router.get('/models/:modelId', getCarModelDetails);

// Modele göre motor hacimlerini getir (public - mobil uygulama için)
router.get('/models/:modelId/engines', getEnginesByModel);

// Araba modeli renk seçeneklerini getir (public - mobil uygulama için)
router.get('/product-colors/:productId', getCarProductColors);

// Models endpoint'i için brand_id query parametresi ile
router.get('/', (req, res) => {
  const { brand_id } = req.query;
  if (brand_id) {
    // brand_id parametresini brandId olarak yönlendir
    req.params.brandId = brand_id;
    return getCarModelsByBrand(req, res);
  }
  res.status(400).json({
    success: false,
    message: 'brand_id parametresi gerekli'
  });
});

// Araç ilanı detayını getir (kimlik doğrulaması gerekli - satıcı bilgileri koruması)
router.get('/:id', authenticateToken, getCarListingDetail);

// Araç ilanı oluştur (kimlik doğrulaması ve zaman kontrolü gerekli)
router.post('/create-listing', authenticateToken, checkListingScheduleWithAdminBypass, checkListingLimitWithAdminBypass, incrementListingCount, createCarListing);

// Admin için araç ilanlarını listele (kimlik doğrulaması gerekli)
router.get('/admin/listings', authenticateToken, getAllCarListingsForAdmin);

// Admin için araç ilanını onayla (kimlik doğrulaması gerekli)
router.patch('/admin/listings/:id/approve', authenticateToken, approveCarListing);

// Admin için araç ilanını reddet (kimlik doğrulaması gerekli)
router.patch('/admin/listings/:id/reject', authenticateToken, rejectCarListing);

// Admin için araç ilanını sil (kimlik doğrulaması gerekli)
router.delete('/admin/listings/:id', authenticateToken, deleteCarListingByAdmin);

// Admin araba ilanları yönetimi artık /admin/cars endpoint'lerinde yapılıyor

module.exports = router;