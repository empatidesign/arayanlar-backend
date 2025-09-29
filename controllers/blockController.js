const db = require('../services/database');

// Kullanıcıyı engelle
const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { blockedId } = req.body;

    // Geçerlilik kontrolleri
    if (!blockedId) {
      return res.status(400).json({
        success: false,
        message: 'Engellenecek kullanıcı ID si gerekli'
      });
    }

    if (blockerId === parseInt(blockedId)) {
      return res.status(400).json({
        success: false,
        message: 'Kendinizi engelleyemezsiniz'
      });
    }

    // Engellenen kullanıcının var olup olmadığını kontrol et
    const userExists = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [blockedId]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Engellenecek kullanıcı bulunamadı'
      });
    }

    // Zaten engellenmiş mi kontrol et
    const existingBlock = await db.query(
      'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );

    if (existingBlock.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcı zaten engellenmiş'
      });
    }

    // Kullanıcıyı engelle
    await db.query(
      'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2)',
      [blockerId, blockedId]
    );

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla engellendi'
    });

  } catch (error) {
    console.error('Kullanıcı engelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı engellenirken hata oluştu'
    });
  }
};

// Kullanıcı engelini kaldır
const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { blockedId } = req.body;

    if (!blockedId) {
      return res.status(400).json({
        success: false,
        message: 'Engeli kaldırılacak kullanıcı ID si gerekli'
      });
    }

    // Engeli kaldır
    const result = await db.query(
      'DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bu kullanıcı zaten engellenmemiş'
      });
    }

    res.json({
      success: true,
      message: 'Kullanıcı engeli başarıyla kaldırıldı'
    });

  } catch (error) {
    console.error('Kullanıcı engel kaldırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı engeli kaldırılırken hata oluştu'
    });
  }
};

// Engellenen kullanıcıları listele
const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(`
      SELECT 
        bu.id as block_id,
        bu.blocked_id,
        u.name,
        u.surname,
        u.profile_image_url,
        bu.created_at as blocked_at
      FROM blocked_users bu
      JOIN users u ON bu.blocked_id = u.id
      WHERE bu.blocker_id = $1
      ORDER BY bu.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Engellenen kullanıcıları listeleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Engellenen kullanıcılar listelenirken hata oluştu'
    });
  }
};

// Kullanıcının engellenip engellenmediğini kontrol et
const checkIfBlocked = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    const result = await db.query(
      'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [userId, targetUserId]
    );

    res.json({
      success: true,
      isBlocked: result.rows.length > 0
    });

  } catch (error) {
    console.error('Engel durumu kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Engel durumu kontrol edilirken hata oluştu'
    });
  }
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkIfBlocked
};