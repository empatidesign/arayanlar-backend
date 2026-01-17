const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 dakika
  max: 3000, // IP başına maksimum 3000 istek
  message: {
    error: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10, // IP başına maksimum 10 auth işlemi (20'den düşürüldü)
  message: {
    error: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dakika
  max: 10, // IP başına maksimum 10 email doğrulama kodu
  message: {
    error: 'Çok fazla doğrulama kodu talebi, lütfen 10 dakika sonra tekrar deneyin'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 20, // IP başına maksimum 20 başarısız giriş 
  message: {
    error: 'Çok fazla başarısız giriş denemesi, hesabınız 1 saat kilitlendi'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Başarılı istekleri sayma
});

// Admin işlemleri için özel rate limiter
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 4000, // IP başına maksimum 1000 admin işlemi
  message: {
    error: 'Çok fazla admin işlemi, lütfen 15 dakika sonra tekrar deneyin'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  emailVerificationLimiter,
  strictAuthLimiter,
  adminLimiter
};