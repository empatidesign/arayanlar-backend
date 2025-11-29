const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // SMTP bağlantısını doğrula
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP connection error:', error);
      } else {
        console.log('SMTP server is ready to take our messages');
      }
    });
    
    this.verificationCodes = new Map();
    this.verifiedEmails = new Set();
    // Şifre sıfırlama için rate limiting
    this.passwordResetAttempts = new Map(); // { email: { count: 0, firstAttempt: timestamp } }
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
        from: `"Arayanvar" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Arayanvar - E-posta Doğrulama Kodu',
        text: `Arayanvar e-posta doğrulama kodunuz: ${code}. Bu kod 10 dakika geçerlidir.`,
        html: `
          <!DOCTYPE html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Arayanvar - E-posta Doğrulama</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Arayanvar</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">E-posta Doğrulama</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hoş Geldiniz!</h2>
                        
                        <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                          Arayanvar hesabınızı oluşturmak için e-posta adresinizi doğrulamanız gerekmektedir. Aşağıdaki doğrulama kodunu kullanın:
                        </p>
                        
                        <!-- Verification Code Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%); border: 2px solid #007AFF; border-radius: 12px; padding: 30px; display: inline-block;">
                                <p style="color: #333333; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Doğrulama Kodu</p>
                                <h1 style="color: #007AFF; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</h1>
                              </div>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Important Notice -->
                        <div style="background-color: #e8f5e8; border: 1px solid #4caf50; border-radius: 8px; padding: 20px; margin: 30px 0;">
                          <p style="color: #2e7d32; margin: 0; font-size: 14px; font-weight: 600;">
                            ✅ <strong>Önemli Bilgiler:</strong>
                          </p>
                          <ul style="color: #2e7d32; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                            <li>Bu kod <strong>10 dakika</strong> süreyle geçerlidir</li>
                            <li>Kodu kimseyle paylaşmayın</li>
                            <li>Bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz</li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="color: #666666; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                          Saygılarımızla,<br>Arayanvar Ekibi
                        </p>
                        <p style="color: #999999; margin: 0; font-size: 12px;">
                          Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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

  // Şifre sıfırlama rate limiting kontrolü
  checkPasswordResetRateLimit(email) {
    const now = Date.now();
    const attemptData = this.passwordResetAttempts.get(email);
    
    if (!attemptData) {
      // İlk deneme
      this.passwordResetAttempts.set(email, {
        count: 1,
        firstAttempt: now
      });
      return { allowed: true, remainingAttempts: 2 };
    }
    
    // 10 dakika geçtiyse sıfırla
    if (now - attemptData.firstAttempt > 10 * 60 * 1000) {
      this.passwordResetAttempts.set(email, {
        count: 1,
        firstAttempt: now
      });
      return { allowed: true, remainingAttempts: 2 };
    }
    
    // 3 deneme hakkı kontrolü
    if (attemptData.count >= 3) {
      const waitTime = Math.ceil((10 * 60 * 1000 - (now - attemptData.firstAttempt)) / 60000); // dakika cinsinden
      return { 
        allowed: false, 
        remainingAttempts: 0,
        waitTime: waitTime
      };
    }
    
    // Deneme sayısını artır
    attemptData.count++;
    return { 
      allowed: true, 
      remainingAttempts: 3 - attemptData.count 
    };
  }

  // Şifre sıfırlama için 6 haneli doğrulama kodu gönderme
  async sendPasswordResetCode(email, verificationCode) {
    try {
      const mailOptions = {
        from: `"Arayanvar" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Arayanvar - Şifre Sıfırlama Kodu',
        text: `Arayanvar şifre sıfırlama kodunuz: ${verificationCode}. Bu kod 15 dakika geçerlidir.`,
        html: `
          <!DOCTYPE html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Arayanvar - Şifre Sıfırlama</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Arayanvar</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Şifre Sıfırlama</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Merhaba!</h2>
                        
                        <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                          Arayanvar hesabınızın şifresini sıfırlamak için bir talepte bulundunuz. Aşağıdaki doğrulama kodunu kullanarak şifrenizi güvenli bir şekilde sıfırlayabilirsiniz.
                        </p>
                        
                        <!-- Verification Code Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%); border: 2px solid #007AFF; border-radius: 12px; padding: 30px; display: inline-block;">
                                <p style="color: #333333; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Doğrulama Kodu</p>
                                <h1 style="color: #007AFF; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${verificationCode}</h1>
                              </div>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Important Notice -->
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0;">
                          <p style="color: #856404; margin: 0; font-size: 14px; font-weight: 600;">
                            ⚠️ <strong>Önemli Bilgiler:</strong>
                          </p>
                          <ul style="color: #856404; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                            <li>Bu kod <strong>15 dakika</strong> süreyle geçerlidir</li>
                            <li>Kodu kimseyle paylaşmayın</li>
                            <li>Bu talebi siz yapmadıysanız, hesabınızın güvenliği için şifrenizi değiştirin</li>
                          </ul>
                        </div>
                        
                        <p style="color: #666666; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                          Herhangi bir sorunuz varsa, destek ekibimizle iletişime geçebilirsiniz.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="color: #666666; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                          Saygılarımızla,<br>Arayanvar Ekibi
                        </p>
                        <p style="color: #999999; margin: 0; font-size: 12px;">
                          Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true, message: 'Şifre sıfırlama kodu gönderildi' };
    } catch (error) {
      console.error('Password reset code email send error:', error);
      return { success: false, message: 'E-posta gönderilirken hata oluştu' };
    }
  }
}

module.exports = new EmailService();