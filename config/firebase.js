const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseApp = null;
let isFirebaseAvailable = false;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    
    // Service account dosyası var mı kontrol et
    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️ firebase-service-account.json bulunamadı');
      console.warn('⚠️ Mock notification service kullanılacak');
      console.warn('📖 Detaylı bilgi için: FIREBASE_SERVICE_ACCOUNT_ALTERNATIVE.md');
      isFirebaseAvailable = false;
      return null;
    }

    // Firebase Admin SDK'yı service account ile başlat
    const serviceAccount = require('./firebase-service-account.json');
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    isFirebaseAvailable = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error.message);
    console.warn('⚠️ Mock notification service kullanılacak');
    isFirebaseAvailable = false;
    return null;
  }
};

const getMessaging = () => {
  if (!firebaseApp && isFirebaseAvailable) {
    initializeFirebase();
  }
  
  if (!isFirebaseAvailable) {
    return null;
  }
  
  return admin.messaging();
};

const isAvailable = () => isFirebaseAvailable;

module.exports = {
  initializeFirebase,
  getMessaging,
  isAvailable,
  admin,
};
