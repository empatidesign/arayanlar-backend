const db = require('../services/database');

// Versiyon bilgilerini getir
const getVersionInfo = async (req, res) => {
  try {
    const query = `
      SELECT 
        current_version_ios,
        minimum_version_ios,
        current_version_android,
        minimum_version_android,
        force_update,
        update_message,
        download_url_android,
        download_url_ios,
        is_active,
        created_at,
        updated_at
      FROM app_versions 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await db.query(query);
    const versionInfo = result.rows[0];
    
    if (!versionInfo) {
      return res.status(404).json({
        success: false,
        message: 'Versiyon bilgisi bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: versionInfo
    });
    
  } catch (error) {
    console.error('Versiyon bilgisi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Versiyon kontrolü yap
const checkVersion = async (req, res) => {
  try {
    const { current_version, platform } = req.body;
    
    if (!current_version || !platform) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli versiyon ve platform bilgisi gerekli'
      });
    }
    
    // Platform kontrolü
    if (platform !== 'ios' && platform !== 'android') {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz platform. ios veya android olmalı'
      });
    }
    
    const query = `
      SELECT 
        current_version_ios,
        minimum_version_ios,
        current_version_android,
        minimum_version_android,
        force_update,
        update_message,
        download_url_android,
        download_url_ios,
        is_active
      FROM app_versions 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await db.query(query);
    const versionInfo = result.rows[0];
    
    if (!versionInfo) {
      return res.json({
        success: true,
        data: {
          update_required: false,
          force_update: false,
          message: 'Versiyon bilgisi bulunamadı'
        }
      });
    }
    
    // Platform'a göre versiyon bilgilerini seç
    const latestVersion = platform === 'ios' 
      ? versionInfo.current_version_ios 
      : versionInfo.current_version_android;
    
    const minimumVersion = platform === 'ios'
      ? versionInfo.minimum_version_ios
      : versionInfo.minimum_version_android;
    
    // Versiyon karşılaştırması
    const currentVersionParts = current_version.split('.').map(Number);
    const latestVersionParts = latestVersion.split('.').map(Number);
    
    let updateRequired = false;
    
    // En son versiyon kontrolü - tüm parçaları karşılaştır
    const maxLength = Math.max(currentVersionParts.length, latestVersionParts.length);
    for (let i = 0; i < maxLength; i++) {
      const current = currentVersionParts[i] || 0;
      const latest = latestVersionParts[i] || 0;
      
      if (current < latest) {
        updateRequired = true;
        break;
      } else if (current > latest) {
        // Mevcut versiyon daha yeni, güncelleme gerekmez
        updateRequired = false;
        break;
      }
      // Eşitse bir sonraki parçaya geç
    }
    
    // Zorunlu güncelleme kontrolü - sadece force_update flag'ine bak
    // Eğer güncelleme gerekiyorsa VE force_update açıksa, zorunlu güncelleme yap
    const forceUpdate = updateRequired && versionInfo.force_update;
    
    console.log('Versiyon kontrolü:', {
      platform,
      current_version,
      latestVersion,
      minimumVersion,
      updateRequired,
      forceUpdate,
      force_update_flag: versionInfo.force_update
    });
    
    const downloadUrl = platform === 'ios' ? versionInfo.download_url_ios : versionInfo.download_url_android;
    
    res.json({
      success: true,
      data: {
        update_required: updateRequired,
        force_update: forceUpdate,
        current_version: latestVersion,
        minimum_version: minimumVersion,
        message: versionInfo.update_message,
        download_url: downloadUrl,
        platform: platform
      }
    });
    
  } catch (error) {
    console.error('Versiyon kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

module.exports = {
  getVersionInfo,
  checkVersion
};

