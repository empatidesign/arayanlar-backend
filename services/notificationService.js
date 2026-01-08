const { getMessaging, isAvailable } = require('../config/firebase');
const firebaseLegacy = require('../config/firebase-legacy');
const db = require('./database');

class NotificationService {
  constructor() {
    // Firebase Admin SDK veya Legacy API kullan
    this.useAdminSDK = false;
    this.useLegacyAPI = false;
    
    // Başlangıçta hangi yöntemin kullanılacağını belirle
    setTimeout(() => {
      if (isAvailable()) {
        this.useAdminSDK = true;
        console.log('✅ Firebase Admin SDK kullanılıyor');
      } else if (firebaseLegacy.isAvailable()) {
        this.useLegacyAPI = true;
        console.log('✅ Firebase Legacy API kullanılıyor');
      } else {
        console.warn('⚠️ Firebase yapılandırılmadı - Mock mode aktif');
      }
    }, 1000);
  }
  // FCM token kaydet
  async saveFCMToken(userId, token) {
    try {
      const query = `
        INSERT INTO user_fcm_tokens (user_id, fcm_token, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (user_id, fcm_token) 
        DO UPDATE SET updated_at = NOW(), is_active = true
        RETURNING *
      `;
      
      const result = await db.query(query, [userId, token]);
      return result.rows[0];
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  // FCM token sil
  async removeFCMToken(userId, token) {
    try {
      const query = `
        UPDATE user_fcm_tokens 
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1 AND fcm_token = $2
        RETURNING *
      `;
      
      const result = await db.query(query, [userId, token]);
      return result.rows[0];
    } catch (error) {
      console.error('Error removing FCM token:', error);
      throw error;
    }
  }

  // Kullanıcının tüm tokenlarını sil (logout için)
  async removeAllUserTokens(userId) {
    try {
      const query = `
        UPDATE user_fcm_tokens 
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [userId]);
      console.log(`✅ Removed ${result.rowCount} tokens for user ${userId}`);
      return result.rows;
    } catch (error) {
      console.error('Error removing all user tokens:', error);
      throw error;
    }
  }

  // Kullanıcının aktif tokenlarını getir
  async getUserTokens(userId) {
    try {
      const query = `
        SELECT fcm_token 
        FROM user_fcm_tokens 
        WHERE user_id = $1 AND is_active = true
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows.map(row => row.fcm_token);
    } catch (error) {
      console.error('Error getting user tokens:', error);
      throw error;
    }
  }

  // Tek kullanıcıya bildirim gönder
  async sendToUser(userId, notification, data = {}) {
    try {
      const tokens = await this.getUserTokens(userId);
      
      if (tokens.length === 0) {
        console.log(`No active tokens found for user ${userId}`);
        return { success: false, message: 'No active tokens' };
      }

      return await this.sendToTokens(tokens, notification, data);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  // Birden fazla tokena bildirim gönder
  async sendToTokens(tokens, notification, data = {}) {
    try {
      // Legacy API kullan
      if (this.useLegacyAPI) {
        const response = await firebaseLegacy.sendToTokens(tokens, notification, data);
        
        // Başarısız tokenleri kontrol et
        if (response.results) {
          response.results.forEach((result, idx) => {
            if (result.error) {
              console.error(`Token ${tokens[idx]} failed:`, result.error);
              // Geçersiz tokenleri temizle
              if (result.error === 'InvalidRegistration' || 
                  result.error === 'NotRegistered') {
                this.removeInvalidToken(tokens[idx]);
              }
            }
          });
        }
        
        return response;
      }
      
      // Admin SDK kullan
      if (this.useAdminSDK) {
        const messaging = getMessaging();
        
        // Firebase data tüm değerler string olmalı
        const stringData = {};
        Object.keys(data).forEach(key => {
          stringData[key] = String(data[key]);
        });
        
        const message = {
          notification: {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.image || undefined,
          },
          data: {
            ...stringData,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
          tokens: tokens,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'arayanvar_notifications',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        };

        const response = await messaging.sendEachForMulticast(message);
        
        console.log(`✅ Successfully sent ${response.successCount} notifications`);
        if (response.failureCount > 0) {
          console.log(`❌ Failed to send ${response.failureCount} notifications`);
          
          // Başarısız tokenleri temizle
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              console.error(`Token ${tokens[idx]} failed:`, resp.error);
              // Geçersiz tokenleri veritabanından sil
              if (resp.error?.code === 'messaging/invalid-registration-token' ||
                  resp.error?.code === 'messaging/registration-token-not-registered') {
                this.removeInvalidToken(tokens[idx]);
              }
            }
          });
        }

        return {
          success: true,
          successCount: response.successCount,
          failureCount: response.failureCount,
        };
      }
      
      // Mock mode
      console.log('📱 [MOCK] Notification would be sent:');
      console.log('   Tokens:', tokens.length);
      console.log('   Title:', notification.title);
      console.log('   Body:', notification.body);
      console.log('   Data:', data);
      
      return {
        success: true,
        successCount: tokens.length,
        failureCount: 0,
        isMock: true,
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Geçersiz token'ı sil
  async removeInvalidToken(token) {
    try {
      const query = `
        UPDATE user_fcm_tokens 
        SET is_active = false, updated_at = NOW()
        WHERE fcm_token = $1
      `;
      await db.query(query, [token]);
    } catch (error) {
      console.error('Error removing invalid token:', error);
    }
  }

  // Yeni ilan bildirimi
  async sendNewListingNotification(listingOwnerId, listing) {
    const notification = {
      title: '🎉 İlanınız Yayında!',
      body: `${listing.title} ilanınız başarıyla yayınlandı.`,
    };

    const data = {
      type: 'new_listing',
      listingId: listing.id.toString(),
      category: listing.category,
    };

    return await this.sendToUser(listingOwnerId, notification, data);
  }

  // Mesaj bildirimi
  async sendMessageNotification(recipientId, sender, message) {
    const notification = {
      title: `💬 ${sender.name} ${sender.surname || ''}`.trim(),
      body: message.text || 'Size mesaj gönderdi',
    };

    const data = {
      type: 'new_message',
      senderId: sender.id.toString(),
      senderName: sender.name,
      senderSurname: sender.surname || '',
      senderImage: sender.profile_image || '',
      conversationId: message.conversationId?.toString(),
    };

    return await this.sendToUser(recipientId, notification, data);
  }

  // Favori ilan güncelleme bildirimi
  async sendFavoriteListingUpdateNotification(userId, listing) {
    const notification = {
      title: '⭐ Favori İlanınızda Güncelleme',
      body: `${listing.title} ilanında değişiklik yapıldı.`,
    };

    const data = {
      type: 'favorite_update',
      listingId: listing.id.toString(),
      category: listing.category,
    };

    return await this.sendToUser(userId, notification, data);
  }

  // Toplu bildirim gönder
  async sendBulkNotification(userIds, notification, data = {}) {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId => this.sendToUser(userId, notification, data))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        successCount: successful,
        failureCount: failed,
      };
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
