const https = require('https');
const { google } = require('googleapis');

class FirebaseHTTPv1 {
  constructor() {
    this.projectId = process.env.FIREBASE_PROJECT_ID;
    this.clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    this.privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  }

  isAvailable() {
    return !!(this.projectId && this.clientEmail && this.privateKey);
  }

  async getAccessToken() {
    try {
      const jwtClient = new google.auth.JWT(
        this.clientEmail,
        null,
        this.privateKey,
        ['https://www.googleapis.com/auth/firebase.messaging'],
        null
      );

      const tokens = await jwtClient.authorize();
      return tokens.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  async sendToTokens(tokens, notification, data = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase HTTP v1 not configured');
    }

    try {
      const accessToken = await this.getAccessToken();
      const results = [];

      for (const token of tokens) {
        try {
          const result = await this.sendToToken(token, notification, data, accessToken);
          results.push({ success: true, token });
        } catch (error) {
          results.push({ success: false, token, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`✅ FCM HTTP v1: ${successCount} başarılı, ${failureCount} başarısız`);

      return {
        success: true,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }

  async sendToToken(token, notification, data = {}, accessToken) {
    const message = {
      message: {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'arayanvar_notifications',
            color: '#FF6B35',
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
      },
    };

    const payload = JSON.stringify(message);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'fcm.googleapis.com',
        port: 443,
        path: `/v1/projects/${this.projectId}/messages:send`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
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
              resolve(response);
            } else {
              console.error('❌ FCM HTTP v1 Error:', response);
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
}

module.exports = new FirebaseHTTPv1();
