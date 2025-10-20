const db = require('../../services/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Admin middleware - kullanıcının admin olup olmadığını kontrol eder
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

// Profil resmi için multer konfigürasyonu
const profileImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/profile-images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const profileImageUpload = multer({ 
  storage: profileImageStorage,
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

// Tüm kullanıcıları listeleme (Admin için)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramCount = 1;

    // Arama filtresi
    if (search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR surname ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Role filtresi
    if (role) {
      whereClause += ` AND role = $${paramCount}`;
      queryParams.push(role);
      paramCount++;
    }

    // Toplam kullanıcı sayısı
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalUsers = parseInt(countResult.rows[0].count);

    // Kullanıcıları getir
    const usersQuery = `
      SELECT 
        id, name, surname, email, phone, role, is_verified,
        subscription_end_date, birthday, gender, city, profile_image_url,
        about, instagram_url, facebook_url, whatsapp_url, linkedin_url,
        created_at, updated_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    queryParams.push(limit, offset);
    const usersResult = await db.query(usersQuery, queryParams);

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Kullanıcıları listeleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar listelenirken hata oluştu'
    });
  }
};

// Kullanıcı detaylarını getirme (Admin için)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, name, surname, email, phone, role, is_verified,
        subscription_end_date, birthday, gender, city, profile_image_url,
        about, instagram_url, facebook_url, whatsapp_url, linkedin_url,
        created_at, updated_at
      FROM users 
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Kullanıcı detayı getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı detayı getirilirken hata oluştu'
    });
  }
};

// Kullanıcı güncelleme (Admin için)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Güncellenebilir alanları kontrol et
    const allowedFields = [
      'name', 'surname', 'email', 'phone', 'role', 'is_verified',
      'subscription_end_date', 'birthday', 'gender', 'city', 
      'profile_image_url', 'about', 'instagram_url', 'facebook_url', 
      'whatsapp_url', 'linkedin_url'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        // Tarih alanları için boş string kontrolü
        if ((key === 'birthday' || key === 'subscription_end_date') && value === '') {
          updates.push(`${key} = $${paramCount}`);
          values.push(null);
        } else {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek geçerli alan bulunamadı'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, surname, email, phone, role, is_verified,
                subscription_end_date, birthday, gender, city, profile_image_url,
                about, instagram_url, facebook_url, whatsapp_url, linkedin_url, updated_at
    `;

    const result = await db.query(query, values);

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error);
    
    // Unique constraint hatası kontrolü
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Bu email veya telefon numarası zaten kullanılıyor'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Kullanıcı güncellenirken hata oluştu'
    });
  }
};

// Kullanıcı silme (Admin için)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Kullanıcının var olup olmadığını kontrol et
    const checkQuery = 'SELECT id, name, surname FROM users WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (!checkResult.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Kullanıcıyı sil (CASCADE ile ilişkili veriler de silinecek)
    const deleteQuery = 'DELETE FROM users WHERE id = $1';
    await db.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: `Kullanıcı ${checkResult.rows[0].name} ${checkResult.rows[0].surname} başarıyla silindi`
    });

  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinirken hata oluştu'
    });
  }
};

// Kullanıcı istatistikleri (Admin için)
const getUserStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
        COUNT(*) FILTER (WHERE role = 'user') as user_count,
        COUNT(*) FILTER (WHERE is_verified = true) as verified_count,
        COUNT(*) FILTER (WHERE is_verified = false) as unverified_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_last_30_days,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_last_7_days
      FROM users
    `;

    const result = await db.query(statsQuery);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Kullanıcı istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı istatistikleri getirilirken hata oluştu'
    });
  }
};

// Profil resmi yükleme (Admin için)
const uploadProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resim dosyası bulunamadı'
      });
    }

    // Kullanıcının var olup olmadığını kontrol et
    const checkQuery = 'SELECT id FROM users WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (!checkResult.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Dosya yolunu veritabanına kaydet
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;
    
    const updateQuery = `
      UPDATE users 
      SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING profile_image_url
    `;

    const result = await db.query(updateQuery, [imageUrl, id]);

    res.json({
      success: true,
      message: 'Profil resmi başarıyla yüklendi',
      data: {
        profile_image_url: result.rows[0].profile_image_url
      }
    });

  } catch (error) {
    console.error('Profil resmi yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil resmi yüklenirken hata oluştu'
    });
  }
};

module.exports = {
  requireAdmin,
  profileImageUpload,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  uploadProfileImage
};