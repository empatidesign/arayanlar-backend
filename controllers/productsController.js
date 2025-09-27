const db = require('../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
const getAllProducts = async (req, res) => {
  try {
    const { brand_id, category_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, b.name as brand_name, s.name as category_name 
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN sections s ON p.category_id = s.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;
    
    if (brand_id) {
      query += ` AND p.brand_id = $${paramIndex}`;
      params.push(brand_id);
      paramIndex++;
    }
    
    if (category_id) {
      query += ` AND p.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }
    
    query += ` ORDER BY p.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Toplam sayı için ayrı sorgu
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    let countParams = [];
    let countParamIndex = 1;
    
    if (brand_id) {
      countQuery += ` AND brand_id = $${countParamIndex}`;
      countParams.push(brand_id);
      countParamIndex++;
    }
    
    if (category_id) {
      countQuery += ` AND category_id = $${countParamIndex}`;
      countParams.push(category_id);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      products: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Ürünler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler getirilirken hata oluştu'
    });
  }
};

// Tek ürün getir
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT p.*, b.name as brand_name, s.name as category_name 
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN sections s ON p.category_id = s.id
      WHERE p.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Ürün getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün getirilirken hata oluştu'
    });
  }
};

// Yeni ürün oluştur
const createProduct = async (req, res) => {
  try {
    const { name, brand_id, category_id, model, description, colors } = req.body;
    
    if (!name || !brand_id || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Ürün adı, marka ID ve kategori ID gerekli'
      });
    }
    
    // Ürün resmi varsa path'ini al
    const image = req.file ? `/uploads/products/${req.file.filename}` : null;
    
    // Colors JSON string ise parse et
    let parsedColors = null;
    if (colors) {
      try {
        parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz renk formatı'
        });
      }
    }
    
    const result = await db.query(
      'INSERT INTO products (name, brand_id, category_id, model, image, description, colors) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, brand_id, category_id, model, image, description, parsedColors ? JSON.stringify(parsedColors) : null]
    );
    
    res.status(201).json({
      success: true,
      message: 'Ürün başarıyla oluşturuldu',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Ürün oluşturulurken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu ürün adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ürün oluşturulurken hata oluştu'
    });
  }
};

// Ürün güncelle
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand_id, category_id, model, description, colors } = req.body;
    
    // Mevcut ürünü kontrol et
    const existingProduct = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    // Güncellenecek alanları belirle
    let updateFields = [];
    let values = [];
    let paramIndex = 1;
    
    if (name) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    
    if (brand_id) {
      updateFields.push(`brand_id = $${paramIndex}`);
      values.push(brand_id);
      paramIndex++;
    }
    
    if (category_id) {
      updateFields.push(`category_id = $${paramIndex}`);
      values.push(category_id);
      paramIndex++;
    }
    
    if (model !== undefined) {
      updateFields.push(`model = $${paramIndex}`);
      values.push(model);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (colors !== undefined) {
      let parsedColors = null;
      if (colors) {
        try {
          parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Geçersiz renk formatı'
          });
        }
      }
      updateFields.push(`colors = $${paramIndex}`);
      values.push(parsedColors ? JSON.stringify(parsedColors) : null);
      paramIndex++;
    }
    
    // Yeni resim dosyası varsa
    if (req.file) {
      const newImage = `/uploads/products/${req.file.filename}`;
      updateFields.push(`image = $${paramIndex}`);
      values.push(newImage);
      paramIndex++;
      
      // Eski resim dosyasını sil
      const oldImage = existingProduct.rows[0].image;
      if (oldImage) {
        const oldImagePath = path.join(__dirname, '..', oldImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    res.json({
      success: true,
      message: 'Ürün başarıyla güncellendi',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Ürün güncellenirken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu ürün adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ürün güncellenirken hata oluştu'
    });
  }
};

// Ürün sil
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mevcut ürünü kontrol et
    const existingProduct = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    // Ürüne bağlı ilan var mı kontrol et
    const listingsCheck = await db.query('SELECT COUNT(*) as count FROM listings WHERE product_id = $1', [id]);
    
    if (parseInt(listingsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu ürüne bağlı ilanlar bulunduğu için silinemez'
      });
    }
    
    // Resim dosyasını sil
    const image = existingProduct.rows[0].image;
    if (image) {
      const imagePath = path.join(__dirname, '..', image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Ürünü sil
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    
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
};

module.exports = {
  upload,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
