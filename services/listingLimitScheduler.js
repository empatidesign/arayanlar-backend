const cron = require('node-cron');
const { resetAllUserCounts } = require('../controllers/listingLimitsController');
const { getListingSchedule } = require('../controllers/listingScheduleController');

class ListingLimitScheduler {
  constructor() {
    this.resetTask = null;
    this.isRunning = false;
  }

  /**
   * Scheduler'ı başlat
   */
  async start() {
    if (this.isRunning) {
      console.log('Listing limit scheduler is already running');
      return;
    }

    try {
      // Mevcut schedule bilgisini al
      const schedule = await getListingSchedule();
      
      if (!schedule || !schedule.is_active) {
        console.log('Listing schedule is not active, scheduler will not start');
        return;
      }

      // Her gün gece yarısı (00:00) kullanıcı sayaçlarını sıfırla
      this.resetTask = cron.schedule('0 0 * * *', async () => {
        try {
          console.log('Running daily listing count reset...');
          await resetAllUserCounts();
          console.log('Daily listing count reset completed successfully');
        } catch (error) {
          console.error('Error during daily listing count reset:', error);
        }
      }, {
        scheduled: true,
        timezone: "Europe/Istanbul" // Türkiye saat dilimi
      });

      this.isRunning = true;
      console.log('Listing limit scheduler started successfully');
      console.log('Daily reset scheduled for 00:00 (Turkey time)');

    } catch (error) {
      console.error('Error starting listing limit scheduler:', error);
    }
  }

  /**
   * Scheduler'ı durdur
   */
  stop() {
    if (this.resetTask) {
      this.resetTask.stop();
      this.resetTask = null;
    }
    this.isRunning = false;
    console.log('Listing limit scheduler stopped');
  }

  /**
   * Scheduler durumunu kontrol et
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasResetTask: !!this.resetTask
    };
  }

  /**
   * Manuel olarak sayaçları sıfırla (test/admin amaçlı)
   */
  async manualReset() {
    try {
      console.log('Manual listing count reset initiated...');
      await resetAllUserCounts();
      console.log('Manual listing count reset completed successfully');
      return { success: true, message: 'Reset completed successfully' };
    } catch (error) {
      console.error('Error during manual reset:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Belirli bir kullanıcının sayacını sıfırla (admin amaçlı)
   */
  async resetUserCount(userId) {
    try {
      const { resetUserCount } = require('../controllers/listingLimitsController');
      await resetUserCount(userId);
      console.log(`User ${userId} listing count reset successfully`);
      return { success: true, message: `User ${userId} count reset successfully` };
    } catch (error) {
      console.error(`Error resetting user ${userId} count:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Schedule değişikliklerini dinle ve scheduler'ı güncelle
   */
  async updateSchedule() {
    try {
      const schedule = await getListingSchedule();
      
      if (!schedule || !schedule.is_active) {
        // Schedule pasif ise scheduler'ı durdur
        if (this.isRunning) {
          this.stop();
          console.log('Schedule deactivated, stopping scheduler');
        }
      } else {
        // Schedule aktif ise scheduler'ı başlat
        if (!this.isRunning) {
          await this.start();
          console.log('Schedule activated, starting scheduler');
        }
      }
    } catch (error) {
      console.error('Error updating scheduler based on schedule:', error);
    }
  }
}

// Singleton instance
const listingLimitScheduler = new ListingLimitScheduler();

module.exports = listingLimitScheduler;