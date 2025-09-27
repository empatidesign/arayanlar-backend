const db = require('../services/database');

// Tüm ülkeleri getir
const getAllCountries = async (req, res) => {
  try {
    const query = 'SELECT * FROM countries ORDER BY name ASC';
    const result = await db.query(query);
    
    res.json({
      success: true,
      countries: result.rows
    });
  } catch (error) {
    console.error('Ülkeler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ülkeler getirilirken hata oluştu'
    });
  }
};

// Tüm şehirleri getir
const getAllCities = async (req, res) => {
  try {
    const { country_id } = req.query;
    
    let query = 'SELECT * FROM cities';
    let params = [];
    
    if (country_id) {
      query += ' WHERE country_id = $1';
      params.push(country_id);
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      cities: result.rows
    });
  } catch (error) {
    console.error('Şehirler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Şehirler getirilirken hata oluştu'
    });
  }
};

// Tüm ilçeleri getir
const getAllDistricts = async (req, res) => {
  try {
    const { city_id } = req.query;
    
    let query = 'SELECT * FROM districts';
    let params = [];
    
    if (city_id) {
      query += ' WHERE city_id = $1';
      params.push(city_id);
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      districts: result.rows
    });
  } catch (error) {
    console.error('İlçeler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlçeler getirilirken hata oluştu'
    });
  }
};

// Tek ülke getir
const getCountryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('SELECT * FROM countries WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ülke bulunamadı'
      });
    }
    
    res.json({
      success: true,
      country: result.rows[0]
    });
  } catch (error) {
    console.error('Ülke getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ülke getirilirken hata oluştu'
    });
  }
};

// Tek şehir getir
const getCityById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT c.*, co.name as country_name 
      FROM cities c
      LEFT JOIN countries co ON c.country_id = co.id
      WHERE c.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şehir bulunamadı'
      });
    }
    
    res.json({
      success: true,
      city: result.rows[0]
    });
  } catch (error) {
    console.error('Şehir getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Şehir getirilirken hata oluştu'
    });
  }
};

// Tek ilçe getir
const getDistrictById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT d.*, c.name as city_name, co.name as country_name 
      FROM districts d
      LEFT JOIN cities c ON d.city_id = c.id
      LEFT JOIN countries co ON c.country_id = co.id
      WHERE d.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlçe bulunamadı'
      });
    }
    
    res.json({
      success: true,
      district: result.rows[0]
    });
  } catch (error) {
    console.error('İlçe getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İlçe getirilirken hata oluştu'
    });
  }
};

// Yeni ülke oluştur
const createCountry = async (req, res) => {
  try {
    const { name, code } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Ülke adı gerekli'
      });
    }
    
    const result = await db.query(
      'INSERT INTO countries (name, code) VALUES ($1, $2) RETURNING *',
      [name, code]
    );
    
    res.status(201).json({
      success: true,
      message: 'Ülke başarıyla oluşturuldu',
      country: result.rows[0]
    });
  } catch (error) {
    console.error('Ülke oluşturulurken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu ülke adı veya kodu zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ülke oluşturulurken hata oluştu'
    });
  }
};

// Yeni şehir oluştur
const createCity = async (req, res) => {
  try {
    const { name, country_id, plate_code } = req.body;
    
    if (!name || !country_id) {
      return res.status(400).json({
        success: false,
        message: 'Şehir adı ve ülke ID gerekli'
      });
    }
    
    const result = await db.query(
      'INSERT INTO cities (name, country_id, plate_code) VALUES ($1, $2, $3) RETURNING *',
      [name, country_id, plate_code]
    );
    
    res.status(201).json({
      success: true,
      message: 'Şehir başarıyla oluşturuldu',
      city: result.rows[0]
    });
  } catch (error) {
    console.error('Şehir oluşturulurken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu şehir adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Şehir oluşturulurken hata oluştu'
    });
  }
};

// Yeni ilçe oluştur
const createDistrict = async (req, res) => {
  try {
    const { name, city_id } = req.body;
    
    if (!name || !city_id) {
      return res.status(400).json({
        success: false,
        message: 'İlçe adı ve şehir ID gerekli'
      });
    }
    
    const result = await db.query(
      'INSERT INTO districts (name, city_id) VALUES ($1, $2) RETURNING *',
      [name, city_id]
    );
    
    res.status(201).json({
      success: true,
      message: 'İlçe başarıyla oluşturuldu',
      district: result.rows[0]
    });
  } catch (error) {
    console.error('İlçe oluşturulurken hata:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu ilçe adı zaten mevcut'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'İlçe oluşturulurken hata oluştu'
    });
  }
};

module.exports = {
  getAllCountries,
  getAllCities,
  getAllDistricts,
  getCountryById,
  getCityById,
  getDistrictById,
  createCountry,
  createCity,
  createDistrict
};
