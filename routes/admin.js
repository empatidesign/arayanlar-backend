const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
// Kullanıcı yönetimi fonksiyonları adminUserController'dan import ediliyor
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  profileImageUpload,
  uploadProfileImage
} = require('../controllers/adminControllers/adminUserController');

// İşlem yönetimi fonksiyonları adminTransactionsController'dan import ediliyor
const {
  getAllTransactions,
  getTransactionById,
  getTransactionStats,
  updateTransactionStatus
} = require('../controllers/adminControllers/adminTransactionsController');

// Kategori yönetimi fonksiyonları adminCategoryController'dan import ediliyor
const {
  requireAdmin: categoryRequireAdmin,
  upload,
  createSection,
  updateSection,
  deleteSection
} = require('../controllers/adminControllers/adminCategoryController');

// Slider yönetimi fonksiyonları adminSliderController'dan import ediliyor
const {
  requireAdmin: sliderRequireAdmin,
  sliderUpload,
  createSlider,
  updateSlider,
  deleteSlider,
  updateSliderOrder
} = require('../controllers/adminControllers/adminSliderController');

// Araba yönetimi fonksiyonları adminCarController'dan import ediliyor
const {
  requireAdmin: carRequireAdmin,
  brandUpload,
  modelUpload,
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
  extendCarListingDuration,
  updateCarBrandOrder,
  updateCarModelOrder
} = require('../controllers/adminControllers/adminCarController');

// Diğer admin fonksiyonları adminController'dan import ediliyor
const {
  requireAdmin
} = require('../controllers/adminController');

// Tüm admin route'ları için middleware
router.use(adminLimiter);
router.use(authenticateToken);
router.use(requireAdmin);

// Kullanıcı yönetimi rotaları
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/upload-image', profileImageUpload.single('image'), uploadProfileImage);

// İşlem yönetimi rotaları
router.get('/transactions', getAllTransactions);
router.get('/transactions/stats', getTransactionStats);
router.get('/transactions/:id', getTransactionById);
router.put('/transactions/:id/status', updateTransactionStatus);

// Dashboard endpoint'leri adminDashboardController'dan import ediliyor
// Şikayet yönetimi fonksiyonları adminReportsController'dan import ediliyor
const {
  getReports,
  getReportById,
  getReportChatMessages,
  updateReportStatus,
  deleteReport
} = require('../controllers/adminControllers/adminReportsController');

// Ban yönetimi fonksiyonları adminBanController'dan import ediliyor
const {
  banUser,
  checkUserBanStatus,
  unbanUser,
  getUserBanHistory
} = require('../controllers/adminControllers/adminBanController');

const { getDashboardStats, getRecentMessages } = require('../controllers/adminControllers/adminDashboardController');

// Version management fonksiyonları adminVersionController'dan import ediliyor
const {
  getAllVersions,
  createVersion,
  updateVersion,
  deleteVersion
} = require('../controllers/adminControllers/adminVersionController');

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/messages', getRecentMessages);

// Watch listing endpoint'leri adminWatchController'dan import ediliyor
const { getPendingWatchListings, approveWatchListing, rejectWatchListing } = require('../controllers/adminControllers/adminWatchController');

// Watch listing yönetimi
router.get('/watch-listings/pending', getPendingWatchListings);
router.put('/watch-listings/:id/approve', approveWatchListing);
router.put('/watch-listings/:id/reject', rejectWatchListing);

// Kategori yönetimi endpoint'leri
router.post('/sections', upload.single('image'), createSection);
router.put('/sections/:id', upload.single('image'), updateSection);
router.delete('/sections/:id', deleteSection);

// Slider yönetimi endpoint'leri
router.post('/sliders', sliderUpload.single('image'), createSlider);
router.put('/sliders/order', updateSliderOrder);
router.put('/sliders/:id', sliderUpload.single('image'), updateSlider);
router.delete('/sliders/:id', deleteSlider);

// Araba marka yönetimi endpoint'leri
router.post('/car-brands', brandUpload.single('logo'), createCarBrand);
// Araba marka sıralarını güncelle
router.put('/car-brands/order', updateCarBrandOrder);
router.put('/car-brands/:id', brandUpload.single('logo'), updateCarBrand);
router.delete('/car-brands/:id', deleteCarBrand);

// Araba model yönetimi
router.post('/car-models', modelUpload, createCarModel);
// Araba model sıralarını güncelle (route'u parametreli path'ten önce tanımla)
router.put('/car-models/order', updateCarModelOrder);
router.put('/car-models/:id', modelUpload, updateCarModel);
router.delete('/car-models/:id', deleteCarModel);
router.put('/car-models/:id/toggle-status', toggleCarModelStatus);

// Araba ilanları yönetimi
router.get('/car-listings', getAllCarListingsForAdmin);
router.put('/car-listings/:id/approve', approveCarListing);
router.put('/car-listings/:id/reject', rejectCarListing);
router.put('/car-listings/:id/revert', revertCarListingToPending);
router.put('/car-listings/:id/extend-duration', extendCarListingDuration);
router.delete('/car-listings/:id', deleteCarListingByAdmin);

// Reports endpoints
router.get('/reports', getReports);
router.get('/reports/:id', getReportById);
router.get('/reports/:id/chat-messages', getReportChatMessages);
router.put('/reports/:id/status', updateReportStatus);
router.delete('/reports/:id', deleteReport);

// Ban management endpoints
router.post('/ban-user', banUser);
router.get('/check-ban-status/:userId', checkUserBanStatus);
router.post('/unban-user', unbanUser);
router.get('/ban-history/:userId', getUserBanHistory);

// Version management routes
router.get('/versions', getAllVersions);
router.post('/versions', createVersion);
router.put('/versions/:id', updateVersion);
router.delete('/versions/:id', deleteVersion);

module.exports = router;
