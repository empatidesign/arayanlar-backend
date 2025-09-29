const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');
const { authenticateToken } = require('../middleware/auth');

// Kullanıcıyı engelle
router.post('/block', authenticateToken, blockController.blockUser);

// Kullanıcı engelini kaldır
router.post('/unblock', authenticateToken, blockController.unblockUser);

// Engellenen kullanıcıları listele
router.get('/blocked-users', authenticateToken, blockController.getBlockedUsers);

// Kullanıcının engellenip engellenmediğini kontrol et
router.get('/check/:targetUserId', authenticateToken, blockController.checkIfBlocked);

module.exports = router;