const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./database');

class UserService {
  async createUser(userData) {
    const { name, surname, email, phone, password } = userData;
    
    try {
      const existingUser = await this.findUserByEmailOrPhone(email, phone);
      if (existingUser) {
        throw new Error('Bu email veya telefon numarası zaten kullanılıyor');
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const query = `
        INSERT INTO users (name, surname, email, phone, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, surname, email, phone, created_at
      `;
      
      const values = [name, surname, email.toLowerCase(), phone, passwordHash];
      const result = await db.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      console.error('Kullanıcı oluşturma hatası:', error);
      throw error;
    }
  }

  async findUserByEmailOrPhone(email, phone) {
    try {
      const query = `
        SELECT id, name, surname, email, phone, password_hash, is_verified, role,
               subscription_end_date, birthday, gender, city, profile_image_url,
               instagram_url, facebook_url, whatsappUrl, linkedin_url,
               created_at
        FROM users 
        WHERE email = $1 OR phone = $2
      `;
      
      const result = await db.query(query, [email.toLowerCase(), phone]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Email veya telefon ile kullanıcı arama hatası:', error);
      throw error;
    }
  }

  async findUserByEmail(email) {
    try {
      const query = `
        SELECT id, name, surname, email, phone, password_hash, is_verified, role,
               subscription_end_date, birthday, gender, city, profile_image_url,
               instagram_url, facebook_url, whatsappUrl, linkedin_url,
               created_at
        FROM users 
        WHERE email = $1
      `;
      
      const result = await db.query(query, [email.toLowerCase()]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Email ile kullanıcı arama hatası:', error);
      throw error;
    }
  }

  async findUserByPhone(phone) {
    try {
      const query = `
        SELECT id, name, surname, email, phone, password_hash, is_verified, role,
               subscription_end_date, birthday, gender, city, profile_image_url,
               instagram_url, facebook_url, whatsapp_url, linkedin_url,
               created_at
        FROM users 
        WHERE phone = $1
      `;
      
      const result = await db.query(query, [phone]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Telefon ile kullanıcı arama hatası:', error);
      throw error;
    }
  }

  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Şifre doğrulama hatası:', error);
      return false;
    }
  }

  generateToken(user) {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname
      };

      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      });
    } catch (error) {
      console.error('Token oluşturma hatası:', error);
      throw error;
    }
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error('Token doğrulama hatası:', error);
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const allowedFields = ['name', 'surname', 'phone', 'subscription_end_date', 'birthday', 'gender', 'city', 'profile_image_url', 'about', 'instagram_url', 'facebook_url', 'whatsapp_url', 'linkedin_url'];
      const updates = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (updates.length === 0) {
        throw new Error('Güncellenecek geçerli alan bulunamadı');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, name, surname, email, phone, subscription_end_date, 
                  birthday, gender, city, profile_image_url, about, instagram_url,
                  facebook_url, whatsapp_url, linkedin_url, updated_at
      `;

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const query = `
        SELECT id, name, surname, email, phone, is_verified, role,
               subscription_end_date, birthday, gender, city, profile_image_url, about,
               instagram_url, facebook_url, whatsapp_url, linkedin_url,
               created_at
        FROM users 
        WHERE id = $1
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Kullanıcı ID ile arama hatası:', error);
      throw error;
    }
  }

  // Şifre sıfırlama doğrulama kodu oluşturma
  async createPasswordResetCode(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await this.findUserByEmail(normalizedEmail);
      if (!user) {
        throw new Error('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı');
      }

      // 6 haneli rastgele kod oluştur
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log('Creating password reset code:', {
        userId: user.id,
        email: normalizedEmail,
        code: verificationCode
      });
      
      // Kodu veritabanına kaydet (15 dakika geçerli)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika
      
      const query = `
        INSERT INTO password_reset_tokens (user_id, verification_code, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          verification_code = EXCLUDED.verification_code,
          expires_at = EXCLUDED.expires_at,
          created_at = EXCLUDED.created_at,
          used = false
      `;
      
      await db.query(query, [user.id, verificationCode, expiresAt]);
      
      return { verificationCode, user };
    } catch (error) {
      console.error('Şifre sıfırlama kodu oluşturma hatası:', error);
      throw error;
    }
  }

  // Şifre sıfırlama doğrulama kodunu kontrol etme
  async verifyPasswordResetCode(email, verificationCode) {
    try {
      // Email'i lowercase yap ve kodu trim et
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedCode = verificationCode.toString().trim();
      
      console.log('Verifying password reset code:', {
        email: normalizedEmail,
        code: normalizedCode,
        codeLength: normalizedCode.length
      });
      
      const query = `
        SELECT prt.*, u.id as user_id, u.email
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE LOWER(TRIM(u.email)) = $1 
          AND TRIM(prt.verification_code) = $2
          AND prt.expires_at > NOW() 
          AND prt.used = false
      `;
      
      const result = await db.query(query, [normalizedEmail, normalizedCode]);
      
      if (!result.rows[0]) {
        // Debug için mevcut kodları kontrol et
        const debugQuery = `
          SELECT prt.verification_code, prt.expires_at, prt.used, u.email
          FROM password_reset_tokens prt
          JOIN users u ON prt.user_id = u.id
          WHERE LOWER(TRIM(u.email)) = $1
        `;
        const debugResult = await db.query(debugQuery, [normalizedEmail]);
        console.log('Debug - Existing codes for email:', debugResult.rows);
      }
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Şifre sıfırlama kodu doğrulama hatası:', error);
      throw error;
    }
  }

  // Şifre sıfırlama (kod ile)
  async resetPasswordWithCode(email, verificationCode, newPassword) {
    try {
      const codeData = await this.verifyPasswordResetCode(email, verificationCode);
      if (!codeData) {
        throw new Error('Geçersiz veya süresi dolmuş doğrulama kodu');
      }

      if (newPassword.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }

      // Yeni şifreyi hashle
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Şifreyi güncelle
      const updatePasswordQuery = `
        UPDATE users 
        SET password_hash = $1 
        WHERE id = $2
      `;
      
      await db.query(updatePasswordQuery, [passwordHash, codeData.user_id]);

      // Kodu kullanılmış olarak işaretle
      const markCodeUsedQuery = `
        UPDATE password_reset_tokens 
        SET used = true 
        WHERE user_id = $1
      `;
      
      await db.query(markCodeUsedQuery, [codeData.user_id]);

      return { success: true, message: 'Şifre başarıyla sıfırlandı' };
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      throw error;
    }
  }

  // Eski token'ları temizleme (cron job için)
  async cleanupExpiredTokens() {
    try {
      const query = `
        DELETE FROM password_reset_tokens 
        WHERE expires_at < NOW() OR used = true
      `;
      
      const result = await db.query(query);
      console.log(`${result.rowCount} expired/used password reset tokens cleaned up`);
      return result.rowCount;
    } catch (error) {
      console.error('Token temizleme hatası:', error);
      throw error;
    }
  }
}

module.exports = new UserService();