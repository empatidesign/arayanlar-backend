const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const chatDir = path.join(__dirname, '../uploads/chat');
    const uploadDir = chatDir;

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    console.log('[upload] destination resolved:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Yüksek entropili rastgele dosya adı
    const rand = crypto.randomBytes(20).toString('hex'); // 40 hex karakter
    let extension = path.extname(file.originalname).toLowerCase();
    if (!extension) {
      // Mimetype'dan uzantı tahmini
      const map = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
      };
      extension = map[file.mimetype] || '.jpg';
    }
    const filename = 'chat-' + rand + extension;

    console.log('[upload] incoming file:', file.originalname, 'mimetype:', file.mimetype);
    console.log('[upload] final filename:', filename);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  console.log('[upload] fileFilter mimetype:', file.mimetype);
  // Resim dosyası kontrolü
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/webp' ||
    file.mimetype === 'image/gif'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;