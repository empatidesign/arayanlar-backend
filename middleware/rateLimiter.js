const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına maksimum 100 istek
  message: {
    error: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 20, // IP başına maksimum 20 auth işlemi
  message: {
    error: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dakika
  max: 5, // IP başına maksimum 5 email doğrulama kodu
  message: {
    error: 'Çok fazla doğrulama kodu talebi, lütfen 10 dakika sonra tekrar deneyin'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 50, // IP başına maksimum 50 başarısız giriş
  message: {
    error: 'Çok fazla başarısız giriş denemesi, hesabınız 1 saat kilitlendi'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Başarılı istekleri sayma
});

module.exports = {
  generalLimiter,
  authLimiter,
  emailVerificationLimiter,
  strictAuthLimiter
};