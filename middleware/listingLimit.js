const { checkUserLimit, incrementUserCount } = require('../controllers/listingLimitsController');

/**
 * İlan oluşturma öncesi limit kontrolü yapan middleware
 * Bu middleware, kullanıcının günlük ilan limitini aşıp aşmadığını kontrol eder
 */
const checkListingLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcının mevcut limit durumunu kontrol et
    const limitStatus = await checkUserLimit(userId);
    
    if (!limitStatus.can_post) {
      return res.status(403).json({
        success: false,
        message: `Günlük ilan limitinizi aştınız. Günlük limit: ${limitStatus.daily_limit}, Mevcut: ${limitStatus.current_count}`,
        error: 'DAILY_LIMIT_EXCEEDED',
        data: {
          current_count: limitStatus.current_count,
          daily_limit: limitStatus.daily_limit,
          remaining: limitStatus.remaining
        }
      });
    }
    
    // Limit kontrolü geçti, devam et
    next();
    
  } catch (error) {
    console.error('Listing limit check error:', error);
    // Hata durumunda güvenli tarafta kalıp işleme devam et
    next();
  }
};

/**
 * İlan oluşturma sonrası sayaç artırma middleware'i
 * Bu middleware, başarılı ilan oluşturma sonrası kullanıcının sayacını artırır
 */
const incrementListingCount = async (req, res, next) => {
  // Response'u intercept et
  const originalSend = res.send;
  
  res.send = function(data) {
    // Response'u gönder
    originalSend.call(this, data);
    
    // Eğer başarılı bir response ise sayacı artır
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const userId = req.user.id;
        incrementUserCount(userId).catch(error => {
          console.error('Error incrementing user listing count:', error);
        });
      } catch (error) {
        console.error('Error in increment middleware:', error);
      }
    }
  };
  
  next();
};

/**
 * Admin kullanıcıları için limit kontrolünü atla
 */
const checkListingLimitWithAdminBypass = async (req, res, next) => {
  try {
    // Kullanıcının admin olup olmadığını kontrol et
    if (req.user && req.user.role === 'admin') {
      // Admin kullanıcıları için limit kontrolünü atla
      return next();
    }
    
    // Normal kullanıcılar için limit kontrolü yap
    return checkListingLimit(req, res, next);
    
  } catch (error) {
    console.error('Admin bypass middleware error:', error);
    return checkListingLimit(req, res, next);
  }
};

module.exports = {
  checkListingLimit,
  incrementListingCount,
  checkListingLimitWithAdminBypass
};