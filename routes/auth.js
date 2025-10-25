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

// Kullanıcı profili güncelleme (sosyal medya)
router.put('/update-social-media', authenticateToken, authController.updateSocialMedia);

// Kullanıcı profili getirme (public)
router.get('/user/:userId', authController.getUserProfile);

// Şifre sıfırlama endpoint'leri
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password-with-code', authController.resetPasswordWithCode);

// Ban durumu kontrol endpoint'i
router.get('/check-ban-status', authenticateToken, authController.checkBanStatus);

module.exports = router;