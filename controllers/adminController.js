const db = require('../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcının admin rolü olup olmadığını kontrol et
    const result = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    if (!result.rows[0] || result.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yetki kontrolü sırasında hata oluştu'
    });
  }
};















// Kullanıcıları listeleme
// Kullanıcı yönetimi fonksiyonları adminUserController.js'e taşındı
// getAllUsers, getUserById, updateUser, deleteUser, getUserStats

// Kategori yönetimi fonksiyonları

// Kullanıcı yönetimi fonksiyonları adminUserController.js dosyasına taşındı

// ===== KATEGORİ YÖNETİMİ FONKSİYONLARI =====

// Kategori yönetimi fonksiyonları adminCategoryController.js dosyasına taşındı

// Kategori yönetimi fonksiyonları adminCategoryController.js dosyasına taşındı

// Kategori yönetimi fonksiyonları adminCategoryController.js dosyasına taşındı

// Slider yönetimi fonksiyonları adminSliderController.js dosyasına taşındı

// Slider yönetimi fonksiyonları adminSliderController.js dosyasına taşındı

// Slider yönetimi fonksiyonları adminSliderController.js dosyasına taşındı

// Slider yönetimi fonksiyonları adminSliderController.js dosyasına taşındı

// Multer konfigürasyonu - araba marka logoları için
// Araba yönetimi fonksiyonları adminCarController.js'ye taşındı

// Araba yönetimi fonksiyonları adminCarController.js'ye taşındı

// Araba yönetimi fonksiyonları adminCarController.js'ye taşındı

// Araba yönetimi fonksiyonları adminCarController.js'ye taşındı

// Araba ilan yönetimi fonksiyonları adminCarController.js'ye taşındı

// Araba ilan yönetimi fonksiyonları adminCarController.js'ye taşındı





















module.exports = {
  requireAdmin,
  // Slider yönetimi fonksiyonları adminSliderController.js dosyasına taşındı
  // Araba yönetimi fonksiyonları adminCarController.js dosyasına taşındı
  // Kullanıcı yönetimi fonksiyonları adminUserController.js dosyasına taşındı
  // Kategori yönetimi fonksiyonları adminCategoryController.js dosyasına taşındı
  // Saat yönetimi fonksiyonları adminWatchController.js dosyasına taşındı
};
