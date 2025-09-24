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
}

module.exports = new EmailService();