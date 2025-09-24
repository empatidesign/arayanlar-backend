const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, query } = require('../services/database');

// Multer konfigürasyonu - ürün resimleri için
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
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

// Tüm ürünleri getir
router.get('/', async (req, res) => {
  try {
    const { brand_id, category_id } = req.query;
    
    let queryText = `
      SELECT p.*, b.name as brand_name, s.name as category_name 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      LEFT JOIN sections s ON b.category_id = s.id
      WHERE 1=1
    `;
    let params = [];
    
    if (brand_id) {
      queryText += ' AND p.brand_id = $1';
      params.push(brand_id);
    }
    
    if (category_id) {
      queryText += ' AND b.category_id = $' + (params.length + 1);
      params.push(category_id);
    }
    
    queryText += ' ORDER BY p.name ASC';
    
    const products = await query(queryText, params);
    
    res.json({
      success: true,
      products: products.rows
    });
  } catch (error) {
    console.error('Ürünler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler getirilirken hata oluştu'
    });
  }
});

// Belirli bir ürünü getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const products = await query(`
      SELECT p.*, b.name as brand_name, s.name as category_name 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      LEFT JOIN sections s ON b.category_id = s.id
      WHERE p.id = $1
    `, [id]);
    
    if (products.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    res.json({
      success: true,
      product: products.rows[0]
    });
  } catch (error) {
    console.error('Ürün getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün getirilirken hata oluştu'
    });
  }
});

// Yeni ürün ekle
router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    const { name, brand_id, model, description, colors, specifications } = req.body;
    
    if (!name || !brand_id) {
      return res.status(400).json({
        success: false,
        message: 'Ürün adı ve marka ID gerekli'
      });
    }
    
    // Çoklu resim yolları
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(file => `/uploads/products/${file.filename}`);
    }
    
    // Renk ve özellik verilerini güvenli şekilde parse et
    let parsedColors = [];
    let parsedSpecifications = {};
    
    try {
      if (colors) {
        if (typeof colors === 'string' && colors.trim() !== '') {
          parsedColors = JSON.parse(colors);
        } else if (typeof colors === 'object') {
          parsedColors = colors;
        }
      }
    } catch (parseError) {
      console.error('Colors JSON parse hatası:', parseError);
      parsedColors = [];
    }

    try {
      if (specifications) {
        if (typeof specifications === 'string' && specifications.trim() !== '') {
          parsedSpecifications = JSON.parse(specifications);
        } else if (typeof specifications === 'object') {
          parsedSpecifications = specifications;
        }
      }
    } catch (parseError) {
      console.error('Specifications JSON parse hatası:', parseError);
      parsedSpecifications = {};
    }
    
    const result = await query(
      'INSERT INTO products (name, brand_id, model, description, images, colors, specifications, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id',
      [name, brand_id, model || null, description || null, JSON.stringify(imagePaths), JSON.stringify(parsedColors), JSON.stringify(parsedSpecifications)]
    );
    
    const newProduct = await query(`
      SELECT p.*, b.name as brand_name, s.name as category_name 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      LEFT JOIN sections s ON b.category_id = s.id
      WHERE p.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json({
      success: true,
      message: 'Ürün başarıyla eklendi',
      product: newProduct.rows[0]
    });
  } catch (error) {
    console.error('Ürün eklenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün eklenirken hata oluştu'
    });
  }
});

// Ürün güncelle
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand_id, model, description, colors, specifications } = req.body;
    
    // Mevcut ürünü kontrol et
    const existingProducts = await query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    
    if (existingProducts.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    // Resim verilerini güvenli şekilde parse et
    let imagePaths = [];
    try {
      const imagesData = existingProducts.rows[0].images;
      if (imagesData && typeof imagesData === 'string' && imagesData.trim() !== '') {
        imagePaths = JSON.parse(imagesData);
      } else if (Array.isArray(imagesData)) {
        imagePaths = imagesData;
      }
    } catch (parseError) {
      console.error('Images parse hatası:', parseError);
      imagePaths = [];
    }
    
    // Yeni resimler yüklendiyse
    if (req.files && req.files.length > 0) {
      // Eski resimleri güvenli şekilde sil
      if (existingProducts.rows[0].images) {
        try {
          const oldImages = JSON.parse(existingProducts.rows[0].images);
          if (Array.isArray(oldImages)) {
            oldImages.forEach(imagePath => {
              const oldImagePath = path.join(__dirname, '..', imagePath);
              if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
              }
            });
          }
        } catch (parseError) {
          console.error('Eski resimler parse hatası:', parseError);
        }
      }
      imagePaths = req.files.map(file => `/uploads/products/${file.filename}`);
    }
    
    // Renk ve özellik verilerini güvenli şekilde parse et
    let parsedColors = [];
    let parsedSpecifications = {};

    // Mevcut veritabanı verilerini güvenli parse et
    try {
      const colorsData = existingProducts.rows[0].colors;
      if (colorsData && typeof colorsData === 'string' && colorsData.trim() !== '') {
        parsedColors = JSON.parse(colorsData);
      } else if (Array.isArray(colorsData)) {
        parsedColors = colorsData;
      }
    } catch (parseError) {
      console.error('Mevcut colors parse hatası:', parseError);
      parsedColors = [];
    }

    try {
      const specificationsData = existingProducts.rows[0].specifications;
      if (specificationsData && typeof specificationsData === 'string' && specificationsData.trim() !== '') {
        parsedSpecifications = JSON.parse(specificationsData);
      } else if (Array.isArray(specificationsData)) {
        parsedSpecifications = specificationsData;
      }
    } catch (parseError) {
      console.error('Mevcut specifications parse hatası:', parseError);
      parsedSpecifications = {};
    }

    // Yeni gelen verileri güvenli parse et
    try {
      if (colors) {
        if (typeof colors === 'string' && colors.trim() !== '') {
          parsedColors = JSON.parse(colors);
        } else if (typeof colors === 'object') {
          parsedColors = colors;
        }
      }
    } catch (parseError) {
      console.error('Yeni colors parse hatası:', parseError);
    }

    try {
      if (specifications) {
        if (typeof specifications === 'string' && specifications.trim() !== '') {
          parsedSpecifications = JSON.parse(specifications);
        } else if (typeof specifications === 'object') {
          parsedSpecifications = specifications;
        }
      }
    } catch (parseError) {
      console.error('Yeni specifications parse hatası:', parseError);
    }
    
    await query(
      'UPDATE products SET name = $1, brand_id = $2, model = $3, description = $4, images = $5, colors = $6, specifications = $7, updated_at = NOW() WHERE id = $8',
      [
        name || existingProducts.rows[0].name, 
        brand_id || existingProducts.rows[0].brand_id, 
        model || existingProducts.rows[0].model,
        description || existingProducts.rows[0].description,
        JSON.stringify(imagePaths),
        JSON.stringify(parsedColors),
        JSON.stringify(parsedSpecifications),
        id
      ]
    );
    
    const updatedProduct = await query(`
      SELECT p.*, b.name as brand_name, s.name as category_name 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      LEFT JOIN sections s ON b.category_id = s.id
      WHERE p.id = $1
    `, [id]);
    
    res.json({
      success: true,
      message: 'Ürün başarıyla güncellendi',
      product: updatedProduct.rows[0]
    });
  } catch (error) {
    console.error('Ürün güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün güncellenirken hata oluştu'
    });
  }
});

// Ürün sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut ürünü kontrol et
    const existingProducts = await query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    
    if (existingProducts.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    // Resim dosyasını sil
    if (existingProducts.rows[0].image) {
      const imagePath = path.join(__dirname, '..', existingProducts.rows[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await query('DELETE FROM products WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Ürün başarıyla silindi'
    });
  } catch (error) {
    console.error('Ürün silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün silinirken hata oluştu'
    });
  }
});

module.exports = router;