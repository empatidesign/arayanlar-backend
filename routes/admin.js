const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { requireAdmin, getAllUsers, getUserById, updateUser, deleteUser, getUserStats, upload, createSection, updateSection, deleteSection } = require('../controllers/adminController');

// Tüm admin route'ları için middleware
router.use(adminLimiter);
router.use(authenticateToken);
router.use(requireAdmin);

// Kullanıcı yönetimi endpoint'leri
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Mevcut watch listing endpoint'leri
const { getPendingWatchListings, approveWatchListing, rejectWatchListing } = require('../controllers/watchController');

// Watch listing yönetimi
router.get('/watch-listings/pending', getPendingWatchListings);
router.put('/watch-listings/:id/approve', approveWatchListing);
router.put('/watch-listings/:id/reject', rejectWatchListing);

// Kategori yönetimi endpoint'leri
router.post('/sections', upload.single('image'), createSection);
router.put('/sections/:id', upload.single('image'), updateSection);
router.delete('/sections/:id', deleteSection);

module.exports = router;
