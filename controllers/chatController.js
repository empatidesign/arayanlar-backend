const db = require('../services/database');
const path = require('path');

// Konuşma bul veya oluştur
const findOrCreateConversation = async (listingId, userId, otherUserId) => {
  // Mevcut konuşmayı bul
  const existingConv = await db.query(`
    SELECT c.id 
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
    WHERE c.listing_id = $3
    LIMIT 1
  `, [userId, otherUserId, listingId]);
  
  if (existingConv.rows.length > 0) {
    return existingConv.rows[0].id;
  }
  
  // Yoksa yeni konuşma oluştur
  const newConv = await db.query(`
    INSERT INTO conversations (listing_id) VALUES ($1) RETURNING id
  `, [listingId]);
  
  const conversationId = newConv.rows[0].id;
  
  // Katılımcıları ekle
  await db.query(`
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)
  `, [conversationId, userId, otherUserId]);
  
  return conversationId;
};

// Bir konuşmanın mesaj geçmişini getir
const getConversationMessages = async (req, res) => {
  try {
    const { listingId, otherUserId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Konuşmayı bul veya oluştur
    const conversationId = await findOrCreateConversation(listingId, userId, otherUserId);
    
    const result = await db.query(`
      SELECT 
        m.id,
        m.sender_id,
        m.message,
        m.message_type,
        m.created_at,
        sender.name as sender_name,
        sender.surname as sender_surname
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = $2
      WHERE m.conversation_id = $1
        AND (
          cp.deleted_at IS NULL 
          OR m.created_at > cp.deleted_at
        )
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `, [conversationId, userId, limit, offset]);
    
    res.json({
      success: true,
      messages: result.rows.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('Mesaj geçmişi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj geçmişi getirilemedi'
    });
  }
};

// Kullanıcının tüm konuşmalarını listele
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(`
      SELECT DISTINCT
        c.id as conversation_id,
        c.listing_id,
        l.title as listing_title,
        l.main_image as listing_image,
        other_user.id as other_user_id,
        other_user.name as other_user_name,
        other_user.surname as other_user_surname,
        other_user.profile_image_url as other_user_image,
        (
          SELECT m.message 
          FROM messages m
          WHERE m.conversation_id = c.id
            AND (my_part.deleted_at IS NULL OR m.created_at > my_part.deleted_at)
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m.created_at 
          FROM messages m
          WHERE m.conversation_id = c.id
            AND (my_part.deleted_at IS NULL OR m.created_at > my_part.deleted_at)
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id != $1
            AND m.created_at > COALESCE(my_part.last_read_at, '1970-01-01')
            AND (my_part.deleted_at IS NULL OR m.created_at > my_part.deleted_at)
        ) as unread_count
      FROM conversations c
      JOIN conversation_participants my_part ON c.id = my_part.conversation_id AND my_part.user_id = $1
      JOIN conversation_participants other_part ON c.id = other_part.conversation_id AND other_part.user_id != $1
      JOIN users other_user ON other_part.user_id = other_user.id
      LEFT JOIN listings l ON c.listing_id = l.id
      WHERE (
        my_part.deleted_at IS NULL 
        OR EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.conversation_id = c.id 
            AND m.created_at > my_part.deleted_at
        )
      )
      ORDER BY last_message_time DESC NULLS LAST
    `, [userId]);
    
    res.json({
      success: true,
      conversations: result.rows
    });
    
  } catch (error) {
    console.error('Konuşma listesi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşma listesi getirilemedi'
    });
  }
};

// Mesaj gönder
const sendMessage = async (req, res) => {
  try {
    const { receiverId, listingId, messageType = 'text' } = req.body;
    const userId = req.user.id;
    let message = req.body.message;
    
    // Engelleme kontrolü
    const blockCheck = await db.query(
      'SELECT id FROM blocked_users WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
      [userId, receiverId]
    );
    
    if (blockCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu kullanıcıyla mesajlaşamazsınız'
      });
    }
    
    // Resim kontrolü
    if (req.file && messageType === 'image') {
      message = `chat/${req.file.filename}`;
    }
    
    // Konuşmayı bul veya oluştur
    const conversationId = await findOrCreateConversation(listingId, userId, receiverId);
    
    // Mesajı kaydet
    const result = await db.query(
      'INSERT INTO messages (conversation_id, sender_id, message, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [conversationId, userId, message, messageType]
    );
    
    const savedMessage = result.rows[0];
    
    // Konuşmayı güncelle
    await db.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );
    
    // deleted_at'ı TEMİZLEME - Eski mesajlar görünmesin
    // Sohbet listesinde görünmesi için getUserConversations sorgusu düzeltilecek
    
    res.json({
      success: true,
      message: 'Mesaj başarıyla gönderildi',
      data: {
        id: savedMessage.id,
        conversation_id: savedMessage.conversation_id,
        sender_id: savedMessage.sender_id,
        message: savedMessage.message,
        message_type: savedMessage.message_type,
        created_at: savedMessage.created_at
      }
    });
    
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj gönderilemedi'
    });
  }
};

// Mesajları okundu olarak işaretle
const markMessagesAsRead = async (req, res) => {
  try {
    const { listingId, senderId } = req.body;
    const userId = req.user.id;
    
    // Konuşmayı bul
    const conversationId = await findOrCreateConversation(listingId, userId, senderId);
    
    // last_read_at güncelle
    await db.query(
      'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    res.json({
      success: true,
      message: 'Mesajlar okundu olarak işaretlendi'
    });
    
  } catch (error) {
    console.error('Mesaj okundu işaretleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesajlar okundu olarak işaretlenemedi'
    });
  }
};

// Sohbeti kullanıcı tarafında sil
const deleteConversation = async (req, res) => {
  try {
    const { listingId, otherUserId } = req.params;
    const userId = req.user.id;
    
    // Konuşmayı bul
    const conversationId = await findOrCreateConversation(listingId, userId, otherUserId);
    
    // Kullanıcının deleted_at'ını güncelle
    const result = await db.query(
      'UPDATE conversation_participants SET deleted_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    res.json({
      success: true,
      message: 'Sohbet başarıyla silindi',
      deletedCount: result.rowCount
    });
    
  } catch (error) {
    console.error('Sohbet silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sohbet silinemedi'
    });
  }
};

module.exports = {
  getConversationMessages,
  getUserConversations,
  sendMessage,
  markMessagesAsRead,
  deleteConversation
};