/**
 * Push Notification Metinleri
 * Tüm bildirim başlık ve içerikleri bu dosyadan yönetilir
 */

module.exports = {
  // Mesaj bildirimleri
  message: {
    title: (senderName, senderSurname) => 
      `${senderName}${senderSurname ? ' ' + senderSurname : ''}`,
    body: {
      text: (messageText) => messageText,
      photo: () => 'Fotoğraf gönderdi',
      default: () => 'Size mesaj gönderdi',
    },
  },

  // İlan bildirimleri
  listing: {
    // İlan onaylandı
    approved: {
      title: () => 'İlanınız Onaylandı!',
      body: (listingTitle) => `${listingTitle} ilanınız başarıyla yayınlandı.`,
    },
    
    // İlan reddedildi
    rejected: {
      title: () => 'İlanınız Reddedildi',
      body: (listingTitle, reason) => 
        reason 
          ? `${listingTitle} ilanınız reddedildi.`
          : `${listingTitle} ilanınız reddedildi.`,
    },
    
    // İlan süresi dolmak üzere
    expiringSoon: {
      title: () => 'İlanınız Sona Eriyor',
      body: (listingTitle, daysLeft) => 
        `${listingTitle} ilanınızın süresi ${daysLeft} gün içinde dolacak.`,
    },
    
    // İlan süresi doldu
    expired: {
      title: () => 'İlanınızın Süresi Doldu',
      body: (listingTitle) => `${listingTitle} ilanınız yayından kaldırıldı.`,
    },
    
    // Yeni ilan yayında
    published: {
      title: () => 'İlanınız Yayında!',
      body: (listingTitle) => `${listingTitle} ilanınız başarıyla yayınlandı.`,
    },
  },

  // Favori bildirimleri
  favorite: {
    // Favori ilan güncellendi
    updated: {
      title: () => '⭐ Favori İlanınızda Güncelleme',
      body: (listingTitle) => `${listingTitle} ilanında değişiklik yapıldı.`,
    },
    
    // Favori ilan fiyat düştü
    priceDropped: {
      title: () => 'Favori İlanınızda Fiyat Düştü!',
      body: (listingTitle, oldPrice, newPrice) => 
        `${listingTitle} ilanının fiyatı ${oldPrice} TL'den ${newPrice} TL'ye düştü.`,
    },
  },

  // Sistem bildirimleri
  system: {
    // Hesap doğrulandı
    accountVerified: {
      title: () => 'Hesabınız Doğrulandı',
      body: () => 'Artık tüm özellikleri kullanabilirsiniz.',
    },
    
    // Hesap askıya alındı
    accountSuspended: {
      title: () => '⚠️ Hesabınız Askıya Alındı',
      body: (reason, duration) => 
        duration
          ? `Hesabınız ${duration} süreyle askıya alındı.`
          : `Hesabınız askıya alındı.`,
    },
    
    // Yeni özellik duyurusu
    newFeature: {
      title: () => 'Yeni Özellik!',
      body: (featureName) => `${featureName} özelliği artık kullanılabilir.`,
    },
    
    // Bakım bildirimi
    maintenance: {
      title: () => 'Bakım Bildirimi',
      body: (startTime, duration) => 
        `Sistem bakımı ${startTime} tarihinde başlayacak. Tahmini süre: ${duration}`,
    },
  },

  // Ödeme bildirimleri
  payment: {
    // Ödeme başarılı
    success: {
      title: () => 'Ödeme Başarılı',
      body: (packageName, amount) => 
        `${packageName} paketi için ${amount} TL ödemeniz alındı.`,
    },
    
    // Ödeme başarısız
    failed: {
      title: () => 'Ödeme Başarısız',
      body: () => 'Ödemeniz işlenemedi. Lütfen tekrar deneyin.',
    },
    
    // Abonelik yenilendi
    subscriptionRenewed: {
      title: () => 'Abonelik Yenilendi',
      body: (packageName, expiryDate) => 
        `${packageName} aboneliğiniz ${expiryDate} tarihine kadar uzatıldı.`,
    },
    
    // Abonelik sona eriyor
    subscriptionExpiring: {
      title: () => 'Aboneliğiniz Sona Eriyor',
      body: (packageName, daysLeft) => 
        `${packageName} aboneliğiniz ${daysLeft} gün içinde sona erecek.`,
    },
  },

  // Etkileşim bildirimleri
  interaction: {
    // İlanınıza yorum yapıldı
    newComment: {
      title: () => '💬 Yeni Yorum',
      body: (userName, listingTitle) => 
        `${userName}, ${listingTitle} ilanınıza yorum yaptı.`,
    },
    
    // İlanınız favorilere eklendi
    addedToFavorites: {
      title: () => '⭐ İlanınız Favorilere Eklendi',
      body: (listingTitle, count) => 
        count > 1
          ? `${listingTitle} ilanınız ${count} kişi tarafından favorilere eklendi.`
          : `${listingTitle} ilanınız favorilere eklendi.`,
    },
    
    // İlanınız görüntülendi
    viewMilestone: {
      title: () => '👀 İlanınız Popüler!',
      body: (listingTitle, viewCount) => 
        `${listingTitle} ilanınız ${viewCount} kez görüntülendi.`,
    },
  },

  // Moderasyon bildirimleri
  moderation: {
    // İlan incelemeye alındı
    underReview: {
      title: () => '🔍 İlanınız İnceleniyor',
      body: (listingTitle) => 
        `${listingTitle} ilanınız moderasyon ekibimiz tarafından inceleniyor.`,
    },
    
    // Rapor alındı
    reportReceived: {
      title: () => '⚠️ İlanınız Rapor Edildi',
      body: (listingTitle) => 
        `${listingTitle} ilanınız için bir şikayet alındı. İnceleme yapılacaktır.`,
    },
  },
};
