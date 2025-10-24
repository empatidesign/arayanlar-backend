const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    this.verificationCodes = new Map();
    this.verifiedEmails = new Set();
  }

  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationCode(email) {
    try {
      const code = this.generateVerificationCode();
      
      this.verificationCodes.set(email, {
        code,
        timestamp: Date.now(),
        attempts: 0
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Arayanvar - E-posta Doğrulama Kodu',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">E-posta Doğrulama</h2>
            <p>Merhaba,</p>
            <p>Arayanvar hesabınızı oluşturmak için aşağıdaki 6 haneli doğrulama kodunu kullanın:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007AFF; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
            </div>
            <p>Bu kod 10 dakika süreyle geçerlidir.</p>
            <p>Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            <br>
            <p>Saygılarımızla,<br>Arayanvar Ekibi</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      
      setTimeout(() => {
        this.verificationCodes.delete(email);
      }, 10 * 60 * 1000);

      return { success: true, message: 'Doğrulama kodu gönderildi' };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, message: 'E-posta gönderilirken hata oluştu' };
    }
  }

  verifyCode(email, inputCode) {
    const storedData = this.verificationCodes.get(email);
    
    if (!storedData) {
      return { success: false, message: 'Doğrulama kodu bulunamadı veya süresi dolmuş' };
    }

    if (storedData.attempts >= 3) {
      this.verificationCodes.delete(email);
      return { success: false, message: 'Çok fazla yanlış deneme. Yeni kod talep edin' };
    }

    if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
      this.verificationCodes.delete(email);
      return { success: false, message: 'Doğrulama kodunun süresi dolmuş' };
    }

    storedData.attempts++;

    if (storedData.code === inputCode) {
      this.verificationCodes.delete(email);
      this.verifiedEmails.add(email);
      return { success: true, message: 'E-posta doğrulandı' };
    }

    return { success: false, message: 'Doğrulama kodu hatalı' };
  }

  isEmailVerified(email) {
    return this.verifiedEmails.has(email);
  }

  clearVerificationCode(email) {
    this.verificationCodes.delete(email);
    this.verifiedEmails.delete(email);
  }

  // Şifre sıfırlama için token ve email gönderme
  async sendPasswordResetEmail(email, resetToken) {
    try {
      // Deep link URL'i oluştur (mobil uygulama için)
      const deepLinkUrl = `arayanvar://reset-password?token=${resetToken}`;
      // Web fallback URL'i (eğer deep link çalışmazsa)
      const webFallbackUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Arayanvar - Şifre Sıfırlama',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Şifre Sıfırlama</h2>
            <p>Merhaba,</p>
            <p>Arayanvar hesabınızın şifresini sıfırlamak için bir talepte bulundunuz.</p>
            <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${webFallbackUrl}" 
                 style="background-color: #007AFF; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Uygulamada Şifremi Sıfırla
              </a>
            </div>
            <p style="text-align: center; margin: 20px 0;">
              <small>Eğer yukarıdaki buton çalışmıyorsa, 
              <a href="${webFallbackUrl}" style="color: #007AFF;">buraya tıklayın</a>
              </small>
            </p>
            <p>Bu link 15 dakika süreyle geçerlidir.</p>
            <p>Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            <p><strong>Güvenlik İpucu:</strong> Şifrenizi kimseyle paylaşmayın ve güçlü bir şifre seçin.</p>
            <br>
            <p>Saygılarımızla,<br>Arayanvar Ekibi</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true, message: 'Şifre sıfırlama e-postası gönderildi' };
    } catch (error) {
      console.error('Password reset email send error:', error);
      return { success: false, message: 'E-posta gönderilirken hata oluştu' };
    }
  }
}

module.exports = new EmailService();