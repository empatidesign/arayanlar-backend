const express = require('express');
const router = express.Router();
const { query } = require('../services/database');

// Belirli bir ürünün renklerini getir
router.get('/:productId/colors', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Ürünün var olup olmadığını kontrol et
    const productResult = await query(
      'SELECT id, colors FROM products WHERE id = $1',
      [productId]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }
    
    const product = productResult.rows[0];
    let colors = [];
    
    // Ürünün colors alanını güvenli şekilde parse et
    if (product.colors) {
      try {
        let parsedColors = product.colors;
        
        // Eğer string ise parse et
        if (typeof product.colors === 'string' && product.colors.trim() !== '') {
          parsedColors = JSON.parse(product.colors);
        }
        
        if (Array.isArray(parsedColors)) {
          colors = parsedColors.map((color, index) => ({
            id: `${productId}_${index}`,
            name: color.name || `Renk ${index + 1}`,
            // images array'inden ilk resmi al, yoksa image field'ını kullan
            image: color.images && color.images.length > 0 
              ? color.images[0] 
              : (color.image || null)
          }));
        }
      } catch (parseError) {
        console.error('Product colors parse hatası:', parseError);
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
});

module.exports = router;