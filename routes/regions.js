const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const REGIONS_FILE_PATH = path.join(__dirname, '../data/regions.json');

// Helper function to read regions data
const readRegionsData = async () => {
  try {
    const data = await fs.readFile(REGIONS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Regions data okuma hatası:', error);
    // Return default data if file doesn't exist
    return {
      AVRUPA: [],
      ASYA: []
    };
  }
};

// Helper function to write regions data
const writeRegionsData = async (data) => {
  try {
    await fs.writeFile(REGIONS_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Regions data yazma hatası:', error);
    return false;
  }
};

// GET /api/regions - Get all regions data
router.get('/', async (req, res) => {
  try {
    const regions = await readRegionsData();
    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error('Regions getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bölgeler getirilirken hata oluştu'
    });
  }
});

// GET /api/regions/:region - Get specific region (AVRUPA or ASYA)
router.get('/:region', async (req, res) => {
  try {
    const { region } = req.params;
    
    if (!['AVRUPA', 'ASYA'].includes(region.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz bölge. AVRUPA veya ASYA olmalı.'
      });
    }

    const regions = await readRegionsData();
    const regionData = regions[region.toUpperCase()];

    res.json({
      success: true,
      data: regionData
    });
  } catch (error) {
    console.error('Bölge getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bölge getirilirken hata oluştu'
    });
  }
});

// POST /api/regions/:region/cities - Add a new city to a region
router.post('/:region/cities', async (req, res) => {
  try {
    const { region } = req.params;
    const { name, color, image } = req.body;

    if (!['AVRUPA', 'ASYA'].includes(region.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz bölge. AVRUPA veya ASYA olmalı.'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Şehir adı gerekli'
      });
    }

    const regions = await readRegionsData();
    const regionKey = region.toUpperCase();
    
    // Generate new ID
    const allCities = [...regions.AVRUPA, ...regions.ASYA];
    const maxId = allCities.length > 0 ? Math.max(...allCities.map(city => parseInt(city.id))) : 0;
    const newId = (maxId + 1).toString();

    const newCity = {
      id: newId,
      name: name.toUpperCase(),
      color: color || '#4A90E2',
      image: image || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.jpg`
    };

    regions[regionKey].push(newCity);

    const success = await writeRegionsData(regions);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Şehir kaydedilirken hata oluştu'
      });
    }

    res.status(201).json({
      success: true,
      data: regions,
      message: 'Şehir başarıyla eklendi'
    });
  } catch (error) {
    console.error('Şehir ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şehir eklenirken hata oluştu'
    });
  }
});

// DELETE /api/regions/:region/cities/:cityId - Delete a city from a region
router.delete('/:region/cities/:cityId', async (req, res) => {
  try {
    const { region, cityId } = req.params;

    if (!['AVRUPA', 'ASYA'].includes(region.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz bölge. AVRUPA veya ASYA olmalı.'
      });
    }

    const regions = await readRegionsData();
    const regionKey = region.toUpperCase();
    
    const cityIndex = regions[regionKey].findIndex(city => city.id === cityId);
    if (cityIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Şehir bulunamadı'
      });
    }

    regions[regionKey].splice(cityIndex, 1);

    const success = await writeRegionsData(regions);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Şehir silinirken hata oluştu'
      });
    }

    res.json({
      success: true,
      data: regions,
      message: 'Şehir başarıyla silindi'
    });
  } catch (error) {
    console.error('Şehir silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şehir silinirken hata oluştu'
    });
  }
});

// PUT /api/regions/:region/cities/:cityId - Update a city
router.put('/:region/cities/:cityId', async (req, res) => {
  try {
    const { region, cityId } = req.params;
    const { name, color, image } = req.body;

    if (!['AVRUPA', 'ASYA'].includes(region.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz bölge. AVRUPA veya ASYA olmalı.'
      });
    }

    const regions = await readRegionsData();
    const regionKey = region.toUpperCase();
    
    const cityIndex = regions[regionKey].findIndex(city => city.id === cityId);
    if (cityIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Şehir bulunamadı'
      });
    }

    // Update city data
    if (name) regions[regionKey][cityIndex].name = name.toUpperCase();
    if (color) regions[regionKey][cityIndex].color = color;
    if (image) regions[regionKey][cityIndex].image = image;

    const success = await writeRegionsData(regions);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Şehir güncellenirken hata oluştu'
      });
    }

    res.json({
      success: true,
      data: regions,
      message: 'Şehir başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Şehir güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şehir güncellenirken hata oluştu'
    });
  }
});

module.exports = router;