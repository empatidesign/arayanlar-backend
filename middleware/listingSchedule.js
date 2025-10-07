const db = require('../services/database');

/**
 * İlan verme saatlerini kontrol eden middleware
 * Bu middleware, kullanıcıların sadece belirlenen saatlerde ilan verebilmesini sağlar
 */
const checkListingSchedule = async (req, res, next) => {
  try {
    // Mevcut tarih ve saat bilgilerini al
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Pazar, 1 = Pazartesi, ..., 6 = Cumartesi
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM formatında

    // Veritabanından bugünün programını çek
    const scheduleQuery = `
      SELECT * FROM listing_schedule 
      WHERE day_of_week = $1 AND is_active = TRUE
    `;
    
    const result = await db.query(scheduleQuery, [currentDay]);
    
    // Eğer bugün için aktif bir program yoksa, ilan vermeye izin verme
    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bugün ilan verme saatleri kapalıdır.',
        error: 'LISTING_SCHEDULE_CLOSED',
        nextAvailableTime: await getNextAvailableTime()
      });
    }

    const schedule = result.rows[0];
    
    // Mevcut saatin, izin verilen saat aralığında olup olmadığını kontrol et
    if (currentTime >= schedule.start_time && currentTime <= schedule.end_time) {
      // İzin verilen saat aralığında, devam et
      next();
    } else {
      // İzin verilen saat aralığı dışında
      const nextAvailableTime = await getNextAvailableTime();
      
      return res.status(403).json({
        success: false,
        message: `İlan verme saatleri: ${schedule.start_time} - ${schedule.end_time} arasındadır.`,
        error: 'LISTING_SCHEDULE_OUTSIDE_HOURS',
        currentSchedule: {
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          dayOfWeek: currentDay
        },
        nextAvailableTime: nextAvailableTime
      });
    }
    
  } catch (error) {
    console.error('Listing schedule middleware error:', error);
    
    // Hata durumunda, güvenlik için ilan vermeye izin verme
    return res.status(500).json({
      success: false,
      message: 'İlan verme saatleri kontrol edilirken bir hata oluştu.',
      error: 'LISTING_SCHEDULE_ERROR'
    });
  }
};

/**
 * Bir sonraki uygun ilan verme zamanını hesapla
 */
const getNextAvailableTime = async () => {
  try {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    // Önce bugün için kontrol et
    const todayQuery = `
      SELECT * FROM listing_schedule 
      WHERE day_of_week = $1 AND is_active = TRUE AND end_time > $2
    `;
    
    const todayResult = await db.query(todayQuery, [currentDay, currentTime]);
    
    if (todayResult.rows.length > 0) {
      const todaySchedule = todayResult.rows[0];
      
      // Eğer bugün hala ilan verme saati varsa
      if (currentTime < todaySchedule.start_time) {
        const nextTime = new Date();
        const [hours, minutes] = todaySchedule.start_time.split(':');
        nextTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return nextTime.toISOString();
      }
    }

    // Sonraki günleri kontrol et (maksimum 7 gün)
    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDay + i) % 7;
      
      const nextDayQuery = `
        SELECT * FROM listing_schedule 
        WHERE day_of_week = $1 AND is_active = TRUE
        ORDER BY start_time ASC
        LIMIT 1
      `;
      
      const nextDayResult = await db.query(nextDayQuery, [checkDay]);
      
      if (nextDayResult.rows.length > 0) {
        const schedule = nextDayResult.rows[0];
        const nextTime = new Date();
        nextTime.setDate(nextTime.getDate() + i);
        
        const [hours, minutes] = schedule.start_time.split(':');
        nextTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        return nextTime.toISOString();
      }
    }

    // Eğer hiçbir uygun zaman bulunamazsa
    return null;
    
  } catch (error) {
    console.error('Error calculating next available time:', error);
    return null;
  }
};

/**
 * Admin kullanıcıları için schedule kontrolünü atla
 */
const checkListingScheduleWithAdminBypass = async (req, res, next) => {
  try {
    // Kullanıcının admin olup olmadığını kontrol et
    if (req.user && req.user.role === 'admin') {
      // Admin kullanıcıları için schedule kontrolünü atla
      return next();
    }
    
    // Normal kullanıcılar için schedule kontrolü yap
    return checkListingSchedule(req, res, next);
    
  } catch (error) {
    console.error('Admin bypass middleware error:', error);
    return checkListingSchedule(req, res, next);
  }
};

module.exports = {
  checkListingSchedule,
  checkListingScheduleWithAdminBypass,
  getNextAvailableTime
};