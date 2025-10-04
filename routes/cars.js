const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
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
  upload,
  modelUpload
} = carsController;

// Araba markalarını listele
router.get('/brands', getCarBrands);

// Araba markası oluştur
router.post('/brands', upload.single('logo'), createCarBrand);

// Araba markası güncelle
router.put('/brands/:id', upload.single('logo'), updateCarBrand);

// Araba markası sil
router.delete('/brands/:id', deleteCarBrand);

// Popüler araba markalarını getir
router.get('/brands/popular', getPopularCarBrands);

// Markaya göre araba modellerini listele
router.get('/brands/:brandId/models', getCarModelsByBrand);

// Tüm araba modellerini getir (admin için)
router.get('/models', getAllCarModels);

// Araba modeli oluştur
router.post('/models', modelUpload, createCarModel);

// Araba modeli güncelle
router.put('/models/:id', modelUpload, updateCarModel);

// Araba modeli sil
router.delete('/models/:id', deleteCarModel);

// Araba modeli durumunu değiştir
router.patch('/models/:id/toggle-status', toggleCarModelStatus);

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

// Araç ilanı detayını getir
router.get('/:id', getCarListingDetail);

// Araç ilanı oluştur (kimlik doğrulaması gerekli)
router.post('/create-listing', authenticateToken, createCarListing);

// Admin için araba ilanları yönetimi
router.get('/admin/listings', getAllCarListingsForAdmin);
router.patch('/admin/listings/:id/approve', approveCarListing);
router.patch('/admin/listings/:id/reject', rejectCarListing);
router.patch('/admin/listings/:id/revert-to-pending', revertCarListingToPending);

module.exports = router;