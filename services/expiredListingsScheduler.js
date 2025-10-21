const cron = require('node-cron');
const db = require('./database');

class ExpiredListingsScheduler {
  constructor() {
    this.expiredTask = null;
    this.isRunning = false;
  }

  /**
   * Scheduler'ı başlat
   */
  async start() {
    if (this.isRunning) {
      console.log('Expired listings scheduler is already running');
      return;
    }

    try {
      // Her 10 dakikada bir süresi dolan ilanları kontrol et
      this.expiredTask = cron.schedule('*/5 * * * *', async () => {
        try {
          console.log('Checking for expired listings...');
          await this.updateExpiredListings();
          console.log('Expired listings check completed');
        } catch (error) {
          console.error('Error during expired listings check:', error);
        }
      }, {
        scheduled: true,
        timezone: "Europe/Istanbul" // Türkiye saat dilimi
      });

      this.isRunning = true;
      console.log('Expired listings scheduler started successfully');
      console.log('Checking for expired listings every 10 minutes');

    } catch (error) {
      console.error('Error starting expired listings scheduler:', error);
    }
  }

  /**
   * Süresi dolan ilanları expired status'e çevir
   */
  async updateExpiredListings() {
    try {
      // Konut ilanları için
      const housingResult = await db.query(`
        UPDATE housing_listings 
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'approved' AND expires_at <= NOW()
        RETURNING id, title
      `);

      // Araç ilanları için
      const carResult = await db.query(`
        UPDATE cars_listings 
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'approved' AND expires_at <= NOW()
        RETURNING id, title
      `);

      // Saat ilanları için (expires_at mantığı)
      const watchResult = await db.query(`
        UPDATE watch_listings 
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'approved' AND expires_at <= NOW()
        RETURNING id, title
      `);

      const totalExpired = housingResult.rows.length + carResult.rows.length + watchResult.rows.length;
      
      if (totalExpired > 0) {
        console.log(`Updated ${totalExpired} expired listings:`);
        console.log(`- Housing: ${housingResult.rows.length}`);
        console.log(`- Cars: ${carResult.rows.length}`);
        console.log(`- Watches: ${watchResult.rows.length}`);
      }

    } catch (error) {
      console.error('Error updating expired listings:', error);
      throw error;
    }
  }

  /**
   * Scheduler'ı durdur
   */
  stop() {
    if (this.expiredTask) {
      this.expiredTask.stop();
      this.expiredTask = null;
    }
    this.isRunning = false;
    console.log('Expired listings scheduler stopped');
  }

  /**
   * Scheduler durumunu kontrol et
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasExpiredTask: !!this.expiredTask
    };
  }

  /**
   * Manuel olarak süresi dolan ilanları kontrol et
   */
  async checkExpiredListingsManually() {
    try {
      console.log('Manual expired listings check started...');
      await this.updateExpiredListings();
      console.log('Manual expired listings check completed');
      return { success: true, message: 'Expired listings check completed' };
    } catch (error) {
      console.error('Error during manual expired listings check:', error);
      return { success: false, message: 'Error during expired listings check', error: error.message };
    }
  }
}

// Singleton instance
const expiredListingsScheduler = new ExpiredListingsScheduler();

module.exports = expiredListingsScheduler;