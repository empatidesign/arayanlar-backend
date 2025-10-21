const express = require('express');
const { authController, upload } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, emailVerificationLimiter, strictAuthLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/send-verification-code', emailVerificationLimiter, authController.sendVerificationCode);

router.post('/verify-email-code', authLimiter, authController.verifyEmailCode);

router.post('/register', authLimiter, authController.register);

router.post('/login', strictAuthLimiter, authController.login);

router.get('/profile', authenticateToken, authController.getProfile);

router.put('/profile', authenticateToken, authController.updateProfile);

router.put('/profile/image', authenticateToken, upload.single('profileImage'), authController.updateProfileImage);

router.put('/social-media', authenticateToken, authController.updateSocialMedia);

router.get('/user/:userId/profile', authenticateToken, authController.getUserProfile);

// Ban durumu kontrol endpoint'i
router.get('/check-ban-status', authenticateToken, authController.checkBanStatus);

module.exports = router;