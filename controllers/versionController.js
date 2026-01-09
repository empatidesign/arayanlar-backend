const db = require('../services/database');

// Versiyon bilgilerini getir
const getVersionInfo = async (req, res) => {
  try {
    const query = `
      SELECT 
        current_version,
        minimum_version,
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
    
    const query = `
      SELECT 
        current_version,
        minimum_version,
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
    
    // Versiyon karşılaştırması
    const currentVersionParts = current_version.split('.').map(Number);
    const latestVersionParts = versionInfo.current_version.split('.').map(Number);
    const minimumVersionParts = versionInfo.minimum_version.split('.').map(Number);
    
    let updateRequired = false;
    let forceUpdate = false;
    
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
    
    // Zorunlu güncelleme kontrolü
    if (versionInfo.force_update) {
      const minMaxLength = Math.max(currentVersionParts.length, minimumVersionParts.length);
      for (let i = 0; i < minMaxLength; i++) {
        const current = currentVersionParts[i] || 0;
        const minimum = minimumVersionParts[i] || 0;
        
        if (current < minimum) {
          forceUpdate = true;
          break;
        } else if (current > minimum) {
          // Mevcut versiyon minimum versiyondan yeni, zorunlu güncelleme gerekmez
          forceUpdate = false;
          break;
        }
        // Eşitse bir sonraki parçaya geç
      }
    }
    
    const downloadUrl = platform === 'ios' ? versionInfo.download_url_ios : versionInfo.download_url_android;
    
    res.json({
      success: true,
      data: {
        update_required: updateRequired,
        force_update: forceUpdate,
        current_version: versionInfo.current_version,
        minimum_version: versionInfo.minimum_version,
        message: versionInfo.update_message,
        download_url: downloadUrl
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

