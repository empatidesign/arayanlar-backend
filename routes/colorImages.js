const express = require('express');
const router = express.Router();
const {
  upload,
  getColorImages,
  uploadColorImage,
  deleteColorImage,
  getColorImageById
} = require('../controllers/colorImagesController');

// Renk resimlerini getir
router.get('/', getColorImages);

// Tek renk resmini getir
router.get('/:id', getColorImageById);

// Renk resmi yükle
router.post('/', upload.single('image'), uploadColorImage);

// Renk resmini sil
router.delete('/:id', deleteColorImage);

module.exports = router;
