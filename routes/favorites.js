const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticateToken } = require('../middleware/auth');

// Tüm route'lar authentication gerektirir
router.use(authenticateToken);

// Kullanıcının favorilerini getir
router.get('/', favoritesController.getUserFavorites);

// Favori ekle
router.post('/', favoritesController.addFavorite);

// Favori çıkar
router.delete('/:listing_id', favoritesController.removeFavorite);

// İlanın favori durumunu kontrol et
router.get('/status/:listing_id', favoritesController.checkFavoriteStatus);

module.exports = router;