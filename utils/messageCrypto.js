const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM için önerilen nonce uzunluğu
const TAG_LENGTH = 16; // GCM auth tag
const PREFIX = 'enc:v1:'; // Şifreli veriyi işaretlemek için basit prefix

// Tek seferlik key türetimi (performans için cache'lenir)
const deriveKey = () => {
  const secret = process.env.MESSAGE_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'dev-fallback-secret';
  // SHA-256 ile 32 byte key türet (başlangıç için yeterli ve hızlı)
  return crypto.createHash('sha256').update(String(secret)).digest();
};

const KEY = deriveKey();

function isEncrypted(text) {
  return typeof text === 'string' && text.startsWith(PREFIX);
}

function encryptText(plain) {
  if (plain === null || plain === undefined) return plain;
  const str = String(plain);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, ciphertext, tag]);
  return PREFIX + combined.toString('base64');
}

function decryptText(text) {
  if (text === null || text === undefined) return text;
  if (!isEncrypted(text)) return text; // geri uyumluluk: düz metin ise olduğu gibi döndür
  try {
    const b64 = text.slice(PREFIX.length);
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < IV_LENGTH + TAG_LENGTH + 1) {
      // Beklenen minimum uzunluk değil, değiştirmeden döndür
      return text;
    }
    const iv = buf.slice(0, IV_LENGTH);
    const tag = buf.slice(buf.length - TAG_LENGTH);
    const ciphertext = buf.slice(IV_LENGTH, buf.length - TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    const plainBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plainBuf.toString('utf8');
  } catch (err) {
    // Şifre çözmede hata olursa veriyi bozmayalım, olduğu gibi döndür (logla)
    console.warn('decryptText failed:', err.message);
    return text;
  }
}

module.exports = {
  encryptText,
  decryptText,
  isEncrypted,
};