const db = require('../services/database');

// İlan verme saatlerini getir
const getListingSchedule = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM listing_schedule ORDER BY day_of_week'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching listing schedule:', error);
    res.status(500).json({
      success: false,
      message: 'İlan verme saatleri alınırken hata oluştu'
    });
  }
};

// İlan verme saatlerini güncelle
const updateListingSchedule = async (req, res) => {
  try {
    const { schedules } = req.body;
    
    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz veri formatı'
      });
    }

    // Transaction başlat
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Mevcut kayıtları sil
      await client.query('DELETE FROM listing_schedule');
      
      // Yeni kayıtları ekle
      for (const schedule of schedules) {
        await client.query(
          'INSERT INTO listing_schedule (day_of_week, start_time, end_time, is_active) VALUES ($1, $2, $3, $4)',
          [schedule.day_of_week, schedule.start_time, schedule.end_time, schedule.is_active]
        );
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'İlan verme saatleri başarıyla güncellendi'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating listing schedule:', error);
    res.status(500).json({
      success: false,
      message: 'İlan verme saatleri güncellenirken hata oluştu'
    });
  }
};

// Şu anki durumu kontrol et (ilan verilebilir mi?)
const checkListingAvailability = async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Pazar, 1=Pazartesi, ...
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS formatında
    
    console.log('=== LISTING AVAILABILITY CHECK ===');
    console.log('Current Date:', now.toISOString());
    console.log('Current Day:', currentDay);
    console.log('Current Time:', currentTime);
    
    const result = await db.query(
      'SELECT * FROM listing_schedule WHERE day_of_week = $1 AND is_active = TRUE',
      [currentDay]
    );
    
    console.log('Schedule Query Result:', result.rows);
    
    let canPost = false;
    let nextAvailableTime = null;
    
    if (result.rows.length > 0) {
      const schedule = result.rows[0];
      console.log('Found Schedule:', schedule);
      console.log('Start Time:', schedule.start_time);
      console.log('End Time:', schedule.end_time);
      console.log('Time Comparison:', {
        currentTime,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        isAfterStart: currentTime >= schedule.start_time,
        isBeforeEnd: currentTime < schedule.end_time
      });
      
      canPost = currentTime >= schedule.start_time && currentTime < schedule.end_time;
      console.log('Can Post Result:', canPost);
      
      if (!canPost) {
        // Bir sonraki uygun zamanı hesapla
        nextAvailableTime = await calculateNextAvailableTime(currentDay, currentTime);
        console.log('Next Available Time:', nextAvailableTime);
      }
    } else {
      console.log('No schedule found for today');
      // Bugün için program yok, bir sonraki uygun günü bul
      nextAvailableTime = await calculateNextAvailableTime(currentDay, currentTime);
      console.log('Next Available Time (no schedule):', nextAvailableTime);
    }
    
    console.log('=== FINAL RESULT ===');
    console.log('Response Data:', {
      canPost,
      currentTime,
      currentDay,
      nextAvailableTime
    });
    
    res.json({
      success: true,
      data: {
        canPost,
        currentTime,
        currentDay,
        nextAvailableTime
      }
    });
  } catch (error) {
    console.error('Error checking listing availability:', error);
    res.status(500).json({
      success: false,
      message: 'İlan verme durumu kontrol edilirken hata oluştu'
    });
  }
};

// Bir sonraki uygun zamanı hesapla
const calculateNextAvailableTime = async (currentDay, currentTime) => {
  try {
    // Önce bugünün kalan saatlerini kontrol et
    const todayResult = await db.query(
      'SELECT * FROM listing_schedule WHERE day_of_week = $1 AND is_active = TRUE AND start_time > $2',
      [currentDay, currentTime]
    );
    
    if (todayResult.rows.length > 0) {
      const schedule = todayResult.rows[0];
      return {
        day: currentDay,
        time: schedule.start_time,
        date: new Date()
      };
    }
    
    // Sonraki günleri kontrol et (7 gün boyunca)
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      const nextResult = await db.query(
        'SELECT * FROM listing_schedule WHERE day_of_week = $1 AND is_active = TRUE ORDER BY start_time LIMIT 1',
        [nextDay]
      );
      
      if (nextResult.rows.length > 0) {
        const schedule = nextResult.rows[0];
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + i);
        
        return {
          day: nextDay,
          time: schedule.start_time,
          date: nextDate
        };
      }
    }
    
    return null; // Hiç uygun zaman yok
  } catch (error) {
    console.error('Error calculating next available time:', error);
    return null;
  }
};

// Kalan süreyi hesapla
const getRemainingTime = async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 8);
    
    console.log('=== GET REMAINING TIME ===');
    console.log('Current Date:', now.toISOString());
    console.log('Current Day:', currentDay);
    console.log('Current Time:', currentTime);
    
    const result = await db.query(
      'SELECT * FROM listing_schedule WHERE day_of_week = $1 AND is_active = TRUE',
      [currentDay]
    );
    
    console.log('Schedule Query Result:', result.rows);
    
    let remainingTime = null;
    let canPost = false;
    
    if (result.rows.length > 0) {
      const schedule = result.rows[0];
      console.log('Found Schedule:', schedule);
      console.log('Start Time:', schedule.start_time);
      console.log('End Time:', schedule.end_time);
      console.log('Time Comparison:', {
        currentTime,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        isAfterStart: currentTime >= schedule.start_time,
        isBeforeEnd: currentTime < schedule.end_time
      });
      
      canPost = currentTime >= schedule.start_time && currentTime < schedule.end_time;
      console.log('Can Post Result:', canPost);
      
      if (canPost) {
        // Şu an ilan verilebilir, süre 0 göster
        remainingTime = 0;
        console.log('Setting remaining time to 0 (can post now)');
      } else {
        // Şu an ilan verilemez, bir sonraki uygun zamana kadar kalan süreyi hesapla
        console.log('Cannot post now, calculating next available time...');
        const nextAvailable = await calculateNextAvailableTime(currentDay, currentTime);
        console.log('Next Available Time:', nextAvailable);
        if (nextAvailable) {
          const nextTime = new Date(nextAvailable.date);
          const [startHour, startMinute] = nextAvailable.time.split(':');
          nextTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
          
          console.log('Calculating remaining time:', {
            nextTime: nextTime.toISOString(),
            currentTime: now.toISOString(),
            timeDifference: nextTime.getTime() - now.getTime()
          });
          
          remainingTime = Math.max(0, nextTime.getTime() - now.getTime());
          console.log('Calculated remaining time (ms):', remainingTime);
        }
      }
    } else {
      console.log('No schedule found for today, calculating next available...');
      // Bugün için program yok
      const nextAvailable = await calculateNextAvailableTime(currentDay, currentTime);
      console.log('Next Available Time (no schedule):', nextAvailable);
      if (nextAvailable) {
        const nextTime = new Date(nextAvailable.date);
        const [startHour, startMinute] = nextAvailable.time.split(':');
        nextTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
        
        console.log('Calculating remaining time (no schedule):', {
          nextTime: nextTime.toISOString(),
          currentTime: now.toISOString(),
          timeDifference: nextTime.getTime() - now.getTime()
        });
        
        remainingTime = Math.max(0, nextTime.getTime() - now.getTime());
        console.log('Calculated remaining time (ms, no schedule):', remainingTime);
      }
    }
    
    console.log('=== GET REMAINING TIME RESULT ===');
    console.log('Final Result:', {
      canPost,
      remainingTime,
      remainingTimeFormatted: remainingTime ? formatRemainingTime(remainingTime) : null
    });
    
    res.json({
      success: true,
      data: {
        canPost,
        remainingTime, // milisaniye cinsinden
        remainingTimeFormatted: remainingTime ? formatRemainingTime(remainingTime) : null
      }
    });
  } catch (error) {
    console.error('Error calculating remaining time:', error);
    res.status(500).json({
      success: false,
      message: 'Kalan süre hesaplanırken hata oluştu'
    });
  }
};

// Kalan süreyi formatla
const formatRemainingTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (days > 0) {
    return `${days} gün ${hours} saat ${minutes} dakika`;
  } else if (hours > 0) {
    return `${hours} saat ${minutes} dakika ${seconds} saniye`;
  } else if (minutes > 0) {
    return `${minutes} dakika ${seconds} saniye`;
  } else {
    return `${seconds} saniye`;
  }
};

module.exports = {
  getListingSchedule,
  updateListingSchedule,
  checkListingAvailability,
  getRemainingTime
};