const db = require('../services/database');

// Ürün renklerini getir
const getProductColors = async (req, res) => {
  try {
    const { product_id } = req.params;
    
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Ürün ID gerekli'
      });
    }
    
    // Ürünün colors alanından renkleri getir
    const query = `
      SELECT colors 
      FROM products 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [product_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    let colors = [];
    if (result.rows[0].colors) {
      try {
        const parsedColors = typeof result.rows[0].colors === 'string' 
          ? JSON.parse(result.rows[0].colors) 
          : result.rows[0].colors;
        
        // Eğer colors array değilse boş array döndür
        if (!Array.isArray(parsedColors)) {
          colors = [];
        } else {
          // Frontend'in beklediği formata dönüştür
          colors = parsedColors.map((color, index) => ({
            id: `${product_id}-${index}`, // Unique ID oluştur
            name: color.name,
            image: color.images && color.images.length > 0 ? color.images[0] : null, // İlk resmi al
            images: color.images || [] // Tüm resimleri de sakla
          }));
        }
      } catch (error) {
        console.error('Colors parse hatası:', error);
        colors = [];
      }
    }
    
    res.json({
      success: true,
      colors: colors
    });
  } catch (error) {
    console.error('Ürün renkleri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün renkleri getirilirken hata oluştu'
    });
  }
};

// Ürüne renk ekle
const addProductColor = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { color_id, stock_quantity = 0 } = req.body;
    
    if (!product_id || !color_id) {
      return res.status(400).json({
        success: false,
        message: 'Ürün ID ve renk ID gerekli'
      });
    }
    
    // Ürünün var olup olmadığını kontrol et
    const productCheck = await db.query('SELECT id FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    // Rengin var olup olmadığını kontrol et
    const colorCheck = await db.query('SELECT id FROM colors WHERE id = $1', [color_id]);
    if (colorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Renk bulunamadı'
      });
    }
    
    // Bu ürün-renk kombinasyonu zaten var mı kontrol et
    const existingCheck = await db.query(
      'SELECT id FROM product_colors WHERE product_id = $1 AND color_id = $2',
      [product_id, color_id]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu ürün-renk kombinasyonu zaten mevcut'
      });
    }
    
    const result = await db.query(
      'INSERT INTO product_colors (product_id, color_id, stock_quantity) VALUES ($1, $2, $3) RETURNING *',
      [product_id, color_id, stock_quantity]
    );
    
    res.status(201).json({
      success: true,
      message: 'Ürün rengi başarıyla eklendi',
      productColor: result.rows[0]
    });
  } catch (error) {
    console.error('Ürün rengi eklenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün rengi eklenirken hata oluştu'
    });
  }
};

// Ürün rengini güncelle
const updateProductColor = async (req, res) => {
  try {
    const { product_id, color_id } = req.params;
    const { stock_quantity } = req.body;
    
    if (!product_id || !color_id) {
      return res.status(400).json({
        success: false,
        message: 'Ürün ID ve renk ID gerekli'
      });
    }
    
    const result = await db.query(
      `UPDATE product_colors 
       SET stock_quantity = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE product_id = $1 AND color_id = $2 
       RETURNING *`,
      [product_id, color_id, stock_quantity]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün rengi bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Ürün rengi başarıyla güncellendi',
      productColor: result.rows[0]
    });
  } catch (error) {
    console.error('Ürün rengi güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün rengi güncellenirken hata oluştu'
    });
  }
};

// Ürün rengini sil
const deleteProductColor = async (req, res) => {
  try {
    const { product_id, color_id } = req.params;
    
    if (!product_id || !color_id) {
      return res.status(400).json({
        success: false,
        message: 'Ürün ID ve renk ID gerekli'
      });
    }
    
    const result = await db.query(
      'DELETE FROM product_colors WHERE product_id = $1 AND color_id = $2 RETURNING *',
      [product_id, color_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün rengi bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Ürün rengi başarıyla silindi'
    });
  } catch (error) {
    console.error('Ürün rengi silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün rengi silinirken hata oluştu'
    });
  }
};

// Tüm renkleri getir
const getAllColors = async (req, res) => {
  try {
    const query = 'SELECT * FROM colors ORDER BY name ASC';
    const result = await db.query(query);
    
    res.json({
      success: true,
      colors: result.rows
    });
  } catch (error) {
    console.error('Renkler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Renkler getirilirken hata oluştu'
    });
  }
};

module.exports = {
  getProductColors,
  addProductColor,
  updateProductColor,
  deleteProductColor,
  getAllColors
};
