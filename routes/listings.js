const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const {
  upload,
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getUserListings
} = require('../controllers/listingsController');

// Tüm ilanları getir (sayfalama ile)
router.get('/', getAllListings);

// Tek ilan getir
router.get('/:id', getListingById);

// Yeni ilan oluştur
router.post('/', auth, upload.array('images', 10), createListing);

// İlan güncelle
router.put('/:id', auth, upload.array('images', 10), updateListing);

// İlan sil
router.delete('/:id', auth, deleteListing);

// Kullanıcının ilanları
router.get('/user/my-listings', auth, getUserListings);

module.exports = router;