const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
               subscription_end_date, birthday, gender, city, profile_image_url,
               about, instagram_url, facebook_url, whatsapp_url, linkedin_url,
               created_at, updated_at
        FROM users 
        WHERE id = $1
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('ID ile kullanıcı arama hatası:', error);
      throw error;
    }
  }
}

module.exports = new UserService();