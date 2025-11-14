const https = require('https');

const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY;
const FCM_ENDPOINT = 'fcm.googleapis.com';

class FirebaseLegacy {
  constructor() {
    this.serverKey = FIREBASE_SERVER_KEY;
  }

  isAvailable() {
    return !!this.serverKey;
  }

  async sendToTokens(tokens, notification, data = {}) {
    if (!this.serverKey) {
      throw new Error('Firebase Server Key not configured');
    }

    const payload = JSON.stringify({
      registration_ids: Array.isArray(tokens) ? tokens : [tokens],
      notification: {
        title: notification.title,
        body: notification.body,
        sound: 'default',
        icon: 'ic_launcher',
        color: '#FF6B35',
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      priority: 'high',
      content_available: true,
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: FCM_ENDPOINT,
        port: 443,
        path: '/fcm/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${this.serverKey}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200) {
              console.log(`✅ FCM Legacy: ${response.success} başarılı, ${response.failure} başarısız`);
              resolve({
                success: true,
                successCount: response.success || 0,
                failureCount: response.failure || 0,
                results: response.results || [],
              });
            } else {
              console.error('❌ FCM Legacy Error:', response);
              reject(new Error(`FCM Error: ${JSON.stringify(response)}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ FCM Request Error:', error);
        reject(error);
      });

      req.write(payload);
      req.end();
    });
  }

  async sendToToken(token, notification, data = {}) {
    return this.sendToTokens([token], notification, data);
  }
}

module.exports = new FirebaseLegacy();
