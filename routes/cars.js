const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { checkListingScheduleWithAdminBypass } = require('../middleware/listingSchedule');
const { checkListingLimitWithAdminBypass, incrementListingCount } = require('../middleware/listingLimit');
const carsController = require('../controllers/carsController');
const {
  getCarBrands,
  getAllCarModels,
  getCarModelsByBrand,
  getEnginesByModel,
  getCarModelDetails,
  getPopularCarBrands,
  searchCars,
  getBodyTypes,
  getFuelTypes,
  getTransmissionTypes,
  getCarProductColors,
  getCarListings,
  createCarListing,
  getCarListingDetail,
  createCarBrand,
  updateCarBrand,
  deleteCarBrand,
  createCarModel,
  updateCarModel,
  deleteCarModel,
  toggleCarModelStatus,
  getAllCarListingsForAdmin,
  approveCarListing,
  rejectCarListing,
  revertCarListingToPending,
  deleteCarListingByAdmin,
  upload,
  modelUpload
} = carsController;

// Araba markalarını listele
router.get('/brands', getCarBrands);

// Araba markası oluştur
router.post('/brands', authenticateToken, upload.single('logo'), createCarBrand);

// Araba markası güncelle
router.put('/brands/:id', authenticateToken, upload.single('logo'), updateCarBrand);

// Araba markası sil
router.delete('/brands/:id', authenticateToken, deleteCarBrand);

// Popüler araba markalarını getir
router.get('/brands/popular', getPopularCarBrands);

// Markaya göre araba modellerini listele
router.get('/brands/:brandId/models', getCarModelsByBrand);

// Tüm araba modellerini getir (admin için)
router.get('/models', authenticateToken, getAllCarModels);

// Araba modeli oluştur
router.post('/models', authenticateToken, modelUpload, createCarModel);

// Araba modeli güncelle
router.put('/models/:id', authenticateToken, modelUpload, updateCarModel);

// Araba modeli sil
router.delete('/models/:id', authenticateToken, deleteCarModel);

// Araba modeli durumunu değiştir
router.patch('/models/:id/toggle-status', authenticateToken, toggleCarModelStatus);

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

// Model detaylarını getir
router.get('/models/:modelId', getCarModelDetails);

// Modele göre motor hacimlerini getir
router.get('/models/:modelId/engines', getEnginesByModel);

// Araba arama
router.get('/search', searchCars);

// Kasa tiplerini getir
router.get('/body-types', getBodyTypes);

// Yakıt tiplerini getir
router.get('/fuel-types', getFuelTypes);

// Şanzıman tiplerini getir
router.get('/transmission-types', getTransmissionTypes);

// Araba model renklerini getir
router.get('/product-colors/:productId', getCarProductColors);

// Araç ilanlarını getir (mobile API için)
router.get('/listings', getCarListings);

// Araç ilanı detayını getir (kimlik doğrulaması gerekli - satıcı bilgileri koruması)
router.get('/:id', authenticateToken, getCarListingDetail);

// Araç ilanı oluştur (kimlik doğrulaması ve zaman kontrolü gerekli)
router.post('/create-listing', authenticateToken, checkListingScheduleWithAdminBypass, checkListingLimitWithAdminBypass, incrementListingCount, createCarListing);

// Admin için araba ilanları yönetimi
router.get('/admin/listings', authenticateToken, getAllCarListingsForAdmin);
router.patch('/admin/listings/:id/approve', authenticateToken, approveCarListing);
router.patch('/admin/listings/:id/reject', authenticateToken, rejectCarListing);
router.patch('/admin/listings/:id/revert-to-pending', authenticateToken, revertCarListingToPending);
router.delete('/admin/listings/:id', authenticateToken, deleteCarListingByAdmin);

module.exports = router;