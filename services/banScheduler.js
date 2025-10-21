const cron = require('node-cron');
const { deactivateExpiredBans } = require('../controllers/adminControllers/adminBanController');

class BanScheduler {
  constructor() {
    this.banTask = null;
    this.isRunning = false;
  }

  /**
   * Scheduler'ı başlat
   */
  async start() {
    try {
      if (this.isRunning) {
        console.log('Ban scheduler is already running');
        return;
      }

      // Her 10 dakikada bir süresi dolan banları kontrol et
      this.banTask = cron.schedule('*/12 * * * *', async () => {
        try {
          console.log('🔍 Süresi dolan banlar kontrol ediliyor...');
          await deactivateExpiredBans();
        } catch (error) {
          console.error('Ban scheduler task error:', error);
        }
      });

      this.isRunning = true;
      console.log('Ban scheduler started successfully');
    } catch (error) {
      console.error('Error starting ban scheduler:', error);
    }
  }

  /**
   * Scheduler'ı durdur
   */
  stop() {
    if (this.banTask) {
      this.banTask.destroy();
      this.banTask = null;
    }
    this.isRunning = false;
    console.log('Ban scheduler stopped');
  }

  /**
   * Scheduler durumunu kontrol et
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      taskExists: !!this.banTask
    };
  }

  /**
   * Manuel olarak süresi dolan banları kontrol et
   */
  async checkExpiredBans() {
    try {
      console.log('🔍 Manuel ban kontrolü başlatılıyor...');
      await deactivateExpiredBans();
      return { success: true, message: 'Süresi dolan banlar kontrol edildi' };
    } catch (error) {
      console.error('Manuel ban kontrolü hatası:', error);
      return { success: false, error: error.message };
    }
  }
}

const banScheduler = new BanScheduler();

module.exports = banScheduler;