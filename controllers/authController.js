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
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
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
            whatsappUrl: user.whatsappUrl,
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
      const { name, surname, phone, subscriptionEndDate, birthday, gender, city, profileImageUrl, about } = req.body;

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
            about: updatedUser.about
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
      if (whatsappUrl !== undefined) socialMediaData.whatsappUrl = whatsappUrl;
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
}

module.exports = { 
  authController: new AuthController(),
  upload
};