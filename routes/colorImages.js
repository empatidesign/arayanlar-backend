const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Renk resimleri için storage ayarları
const colorImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'color-images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'color-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadColorImages = multer({ 
  storage: colorImageStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Renk resimleri yükleme endpoint'i
router.post('/upload', uploadColorImages.array('colorImages', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hiç resim yüklenmedi'
      });
    }

    const imagePaths = req.files.map(file => `/uploads/color-images/${file.filename}`);
    
    res.json({
      success: true,
      message: 'Renk resimleri başarıyla yüklendi',
      images: imagePaths
    });
  } catch (error) {
    console.error('Renk resimleri yüklenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Renk resimleri yüklenirken hata oluştu'
    });
  }
});

module.exports = router;