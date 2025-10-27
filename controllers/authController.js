const userService = require('../services/userService');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
  }
});

class AuthController {
  async register(req, res) {
    try {
      const { name, surname, email, phone, password } = req.body;

      if (!name || !surname || !email || !phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'Tüm alanlar zorunludur'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Şifre en az 6 karakter olmalıdır'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir email adresi giriniz'
        });
      }

      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir telefon numarası giriniz'
        });
      }

      if (!emailService.isEmailVerified(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'E-posta adresi doğrulanmamış. Lütfen önce e-posta doğrulaması yapın.'
        });
      }

      const user = await userService.createUser({
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim(),
        phone: phone.replace(/\s/g, ''),
        password
      });

      emailService.clearVerificationCode(email.trim());

      const token = userService.generateToken(user);

      res.status(201).json({
        success: true,
        message: 'Kayıt başarılı',
        data: {
          user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            phone: user.phone
          },
          token
        }
      });

    } catch (error) {
      console.error('Register error:', error);
      
      if (error.message.includes('zaten kullanılıyor')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Kayıt sırasında bir hata oluştu'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email ve şifre zorunludur'
        });
      }

      const user = await userService.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email veya şifre hatalı'
        });
      }

      const isPasswordValid = await userService.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email veya şifre hatalı'
        });
      }

      // Ban kontrolü
      const db = require('../services/database');
      const banCheck = await db.query(`
        SELECT ub.*, u.name as banned_by_name
        FROM user_bans ub
        LEFT JOIN users u ON ub.banned_by = u.id
        WHERE ub.user_id = $1 
          AND ub.is_active = TRUE 
          AND (ub.banned_until IS NULL OR ub.banned_until > NOW())
        ORDER BY ub.created_at DESC
        LIMIT 1
      `, [user.id]);

      if (banCheck.rows.length > 0) {
        const ban = banCheck.rows[0];
        return res.status(403).json({
          success: false,
          message: 'Hesabınız banlanmıştır',
          banInfo: {
            reason: ban.reason,
            bannedUntil: ban.banned_until,
            bannedBy: ban.banned_by_name,
            createdAt: ban.created_at,
            isPermanent: ban.banned_until === null
          }
        });
      }

      const token = userService.generateToken(user);

      res.json({
        success: true,
        message: 'Giriş başarılı',
        data: {
          user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            phone: user.phone
          },
          token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Giriş sırasında bir hata oluştu'
      });
    }
  }

  // Kullanıcının ban durumunu kontrol et (uygulama içinde periyodik kontrol için)
  async checkBanStatus(req, res) {
    try {
      const userId = req.user.id;

      // Ban kontrolü
      const db = require('../services/database');
      const banCheck = await db.query(`
        SELECT ub.*, u.name as banned_by_name
        FROM user_bans ub
        LEFT JOIN users u ON ub.banned_by = u.id
        WHERE ub.user_id = $1 
          AND ub.is_active = TRUE 
          AND (ub.banned_until IS NULL OR ub.banned_until > NOW())
        ORDER BY ub.created_at DESC
        LIMIT 1
      `, [userId]);

      if (banCheck.rows.length > 0) {
        const ban = banCheck.rows[0];
        return res.status(403).json({
          success: false,
          message: 'Hesabınız banlanmıştır',
          isBanned: true,
          banInfo: {
            reason: ban.reason,
            bannedUntil: ban.banned_until,
            bannedBy: ban.banned_by_name,
            createdAt: ban.created_at,
            isPermanent: ban.banned_until === null
          }
        });
      }

      res.json({
        success: true,
        isBanned: false,
        message: 'Kullanıcı aktif'
      });

    } catch (error) {
      console.error('Ban status check error:', error);
      res.status(500).json({
        success: false,
        message: 'Ban durumu kontrol edilirken bir hata oluştu'
      });
    }
  }

  async sendVerificationCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'E-posta adresi zorunludur'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir e-posta adresi giriniz'
        });
      }

      const existingUser = await userService.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Bu e-posta adresi zaten kullanılıyor'
        });
      }

      const result = await emailService.sendVerificationCode(email);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Doğrulama kodu e-posta adresinize gönderildi'
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Send verification code error:', error);
      res.status(500).json({
        success: false,
        message: 'Doğrulama kodu gönderilirken hata oluştu'
      });
    }
  }

  async verifyEmailCode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'E-posta ve doğrulama kodu zorunludur'
        });
      }

      const result = emailService.verifyCode(email, code);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Verify email code error:', error);
      res.status(500).json({
        success: false,
        message: 'Doğrulama kodu kontrol edilirken hata oluştu'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            phone: user.phone,
            subscriptionEndDate: user.subscription_end_date,
            birthday: user.birthday,
            gender: user.gender,
            city: user.city,
            profileImageUrl: user.profile_image_url,
            about: user.about,
            instagramUrl: user.instagram_url,
            facebookUrl: user.facebook_url,
            whatsappUrl: user.whatsapp_url,
            linkedinUrl: user.linkedin_url,
            isVerified: user.is_verified,
            createdAt: user.created_at
          }
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Profil bilgileri alınırken hata oluştu'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { 
        name, surname, phone, subscriptionEndDate, birthday, gender, city, 
        profileImageUrl, about, instagram_url, facebook_url, whatsapp_url, linkedin_url 
      } = req.body;

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (surname) updateData.surname = surname.trim();
      if (phone) updateData.phone = phone.replace(/\s/g, '');
      if (subscriptionEndDate) updateData.subscription_end_date = subscriptionEndDate;
      if (birthday) updateData.birthday = birthday;
      if (gender) updateData.gender = gender.trim();
      if (city) updateData.city = city.trim();
      if (profileImageUrl) updateData.profile_image_url = profileImageUrl;
      if (about !== undefined) updateData.about = about.trim();
      
      // Sosyal medya alanları
      if (instagram_url !== undefined) updateData.instagram_url = instagram_url;
      if (facebook_url !== undefined) updateData.facebook_url = facebook_url;
      if (whatsapp_url !== undefined) updateData.whatsapp_url = whatsapp_url;
      if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Güncellenecek alan bulunamadı'
        });
      }

      if (phone) {
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
          return res.status(400).json({
            success: false,
            message: 'Geçerli bir telefon numarası giriniz'
          });
        }

        // Check if phone number is already in use by another user
        try {
          const existingUser = await userService.findUserByPhone(phone.replace(/\s/g, ''));
          if (existingUser && existingUser.id !== userId) {
            return res.status(409).json({
              success: false,
              message: 'Bu telefon numarası zaten kullanılıyor'
            });
          }
        } catch (error) {
          console.error('Phone uniqueness check error:', error);
          return res.status(500).json({
            success: false,
            message: 'Telefon numarası kontrolü sırasında hata oluştu'
          });
        }
      }

      if (birthday) {
        const birthDate = new Date(birthday);
        if (isNaN(birthDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Geçerli bir doğum tarihi giriniz'
          });
        }
      }

      if (gender && !['Erkek', 'Kadın', 'Diğer'].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir cinsiyet seçiniz'
        });
      }

      const updatedUser = await userService.updateUser(userId, updateData);

      res.json({
        success: true,
        message: 'Profil başarıyla güncellendi',
        data: {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            surname: updatedUser.surname,
            email: updatedUser.email,
            phone: updatedUser.phone,
            subscriptionEndDate: updatedUser.subscription_end_date,
            birthday: updatedUser.birthday,
            gender: updatedUser.gender,
            city: updatedUser.city,
            profileImageUrl: updatedUser.profile_image_url,
            about: updatedUser.about,
            instagramUrl: updatedUser.instagram_url,
            facebookUrl: updatedUser.facebook_url,
            whatsappUrl: updatedUser.whatsapp_url,
            linkedinUrl: updatedUser.linkedin_url
          }
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Profil güncellenirken hata oluştu'
      });
    }
  }

  async updateProfileImage(req, res) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Profil fotoğrafı seçilmedi'
        });
      }

      const profileImageUrl = `/uploads/profiles/${req.file.filename}`;
      
      const updatedUser = await userService.updateUser(userId, {
        profile_image_url: profileImageUrl
      });

      res.json({
        success: true,
        message: 'Profil fotoğrafı başarıyla güncellendi',
        data: {
          profileImageUrl: profileImageUrl,
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            surname: updatedUser.surname,
            email: updatedUser.email,
            phone: updatedUser.phone,
            subscriptionEndDate: updatedUser.subscription_end_date,
            birthday: updatedUser.birthday,
            gender: updatedUser.gender,
            city: updatedUser.city,
            profileImageUrl: updatedUser.profile_image_url
          }
        }
      });

    } catch (error) {
      console.error('Update profile image error:', error);
      res.status(500).json({
        success: false,
        message: 'Profil fotoğrafı güncellenirken hata oluştu'
      });
    }
  }

  async updateSocialMedia(req, res) {
    try {
      const userId = req.user.id;
      const { instagram_url, facebook_url, whatsappUrl, linkedin_url } = req.body;

      const socialMediaData = {};
      
      if (instagram_url !== undefined) socialMediaData.instagram_url = instagram_url;
      if (facebook_url !== undefined) socialMediaData.facebook_url = facebook_url;
      if (whatsappUrl !== undefined) socialMediaData.whatsappUrl = whatsapp_url;
      if (linkedin_url !== undefined) socialMediaData.linkedin_url = linkedin_url;

      if (Object.keys(socialMediaData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Güncellenecek sosyal medya alanı bulunamadı'
        });
      }

      const updatedUser = await userService.updateUser(userId, socialMediaData);

      res.json({
        success: true,
        message: 'Sosyal medya bilgileri başarıyla güncellendi',
        user: updatedUser
      });
    } catch (error) {
      console.error('Sosyal medya güncelleme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Sosyal medya bilgileri güncellenirken bir hata oluştu'
      });
    }
  }

  async getUserProfile(req, res) {
    try {
      const userId = req.params.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcı ID gerekli'
        });
      }

      const user = await userService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      res.json({
        success: true,
        user: user
      });
    } catch (error) {
      console.error('Kullanıcı profili getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Sunucu hatası'
      });
    }
  }

  // Şifre sıfırlama talebi
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'E-posta adresi gerekli'
        });
      }

      // E-posta formatını kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir e-posta adresi girin'
        });
      }

      // Önce kullanıcının var olup olmadığını kontrol et
      const user = await userService.findUserByEmail(email);
      
      if (!user) {
        // Kayıtlı olmayan e-posta için açık hata mesajı döndür
        return res.status(404).json({
          success: false,
          message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı'
        });
      }

      try {
        const { verificationCode } = await userService.createPasswordResetCode(email);
        
        // E-posta gönder
        const emailResult = await emailService.sendPasswordResetCode(email, verificationCode);
        
        if (!emailResult.success) {
          return res.status(500).json({
            success: false,
            message: 'E-posta gönderilirken hata oluştu'
          });
        }

        res.json({
          success: true,
          message: 'Şifre sıfırlama kodu e-posta adresinize gönderildi'
        });
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error('Şifre sıfırlama talebi hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Sunucu hatası'
      });
    }
  }

  // Şifre sıfırlama token'ını doğrula
  async verifyResetToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token gerekli'
        });
      }

      const tokenData = await userService.verifyPasswordResetToken(token);
      
      if (!tokenData) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz veya süresi dolmuş token'
        });
      }

      res.json({
        success: true,
        message: 'Token geçerli',
        email: tokenData.email
      });
    } catch (error) {
      console.error('Token doğrulama hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Sunucu hatası'
      });
    }
  }

  // Şifre sıfırlama kodunu doğrula
  async verifyResetCode(req, res) {
    try {
      const { email, verificationCode } = req.body;

      if (!email || !verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'E-posta ve doğrulama kodu gerekli'
        });
      }

      const codeData = await userService.verifyPasswordResetCode(email, verificationCode);
      
      if (!codeData) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz veya süresi dolmuş doğrulama kodu'
        });
      }

      res.json({
        success: true,
        message: 'Doğrulama kodu geçerli'
      });
    } catch (error) {
      console.error('Kod doğrulama hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Sunucu hatası'
      });
    }
  }

  // Şifre sıfırlama (kod ile)
  async resetPasswordWithCode(req, res) {
    try {
      const { email, verificationCode, newPassword, confirmPassword } = req.body;

      if (!email || !verificationCode || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Tüm alanlar zorunludur'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Şifreler eşleşmiyor'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Şifre en az 6 karakter olmalıdır'
        });
      }

      const result = await userService.resetPasswordWithCode(email, verificationCode, newPassword);
      
      res.json({
        success: true,
        message: 'Şifreniz başarıyla sıfırlandı'
      });
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      
      if (error.message === 'Geçersiz veya süresi dolmuş doğrulama kodu') {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz veya süresi dolmuş doğrulama kodu'
        });
      }

      if (error.message === 'Şifre en az 6 karakter olmalıdır') {
        return res.status(400).json({
          success: false,
          message: 'Şifre en az 6 karakter olmalıdır'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Sunucu hatası'
      });
    }
  }
}

module.exports = { 
  authController: new AuthController(),
  upload
};