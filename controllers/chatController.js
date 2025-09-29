const db = require('../services/database');
const path = require('path');

// Bir konuşmanın mesaj geçmişini getir
const getConversationMessages = async (req, res) => {
  try {
    const { listingId, otherUserId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
      SELECT 
        cm.*,
        sender.name as sender_name,
        sender.surname as sender_surname,
        receiver.name as receiver_name,
        receiver.surname as receiver_surname
      FROM chat_messages cm
      JOIN users sender ON cm.sender_id = sender.id
      JOIN users receiver ON cm.receiver_id = receiver.id
      WHERE cm.listing_id = $1 
        AND ((cm.sender_id = $2 AND cm.receiver_id = $3) 
             OR (cm.sender_id = $3 AND cm.receiver_id = $2))
      ORDER BY cm.created_at DESC
      LIMIT $4 OFFSET $5
    `, [listingId, userId, otherUserId, limit, offset]);
    
    res.json({
      success: true,
      messages: result.rows.reverse(), // En eski mesajdan en yeniye sırala
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
        l.id as listing_id,
        l.title as listing_title,
        l.main_image as listing_image,
        CASE 
          WHEN cm.sender_id = $1 THEN cm.receiver_id
          ELSE cm.sender_id
        END as other_user_id,
        CASE 
          WHEN cm.sender_id = $1 THEN receiver.name
          ELSE sender.name
        END as other_user_name,
        CASE 
          WHEN cm.sender_id = $1 THEN receiver.surname
          ELSE sender.surname
        END as other_user_surname,
        CASE 
          WHEN cm.sender_id = $1 THEN receiver.profile_image
          ELSE sender.profile_image
        END as other_user_image,
        (
          SELECT message 
          FROM chat_messages cm2 
          WHERE cm2.listing_id = l.id 
            AND ((cm2.sender_id = $1 AND cm2.receiver_id = (CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END))
                 OR (cm2.sender_id = (CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END) AND cm2.receiver_id = $1))
          ORDER BY cm2.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM chat_messages cm2 
          WHERE cm2.listing_id = l.id 
            AND ((cm2.sender_id = $1 AND cm2.receiver_id = (CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END))
                 OR (cm2.sender_id = (CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END) AND cm2.receiver_id = $1))
          ORDER BY cm2.created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM chat_messages cm2 
          WHERE cm2.listing_id = l.id 
            AND cm2.receiver_id = $1 
            AND cm2.is_read = false
        ) as unread_count
      FROM chat_messages cm
      JOIN listings l ON cm.listing_id = l.id
      JOIN users sender ON cm.sender_id = sender.id
      JOIN users receiver ON cm.receiver_id = receiver.id
      WHERE cm.sender_id = $1 OR cm.receiver_id = $1
      ORDER BY last_message_time DESC
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
    
    // Eğer resim yüklendiyse, dosya yolunu message olarak kaydet
    if (req.file && messageType === 'image') {
      message = `chat/${req.file.filename}`;
    }
    
    // Mesajı veritabanına kaydet
    const result = await db.query(
      'INSERT INTO chat_messages (sender_id, receiver_id, listing_id, message, message_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, receiverId, listingId, message, messageType]
    );
    
    const savedMessage = result.rows[0];
    
    res.json({
      success: true,
      message: 'Mesaj başarıyla gönderildi',
      data: {
        id: savedMessage.id,
        sender_id: savedMessage.sender_id,
        receiver_id: savedMessage.receiver_id,
        listing_id: savedMessage.listing_id,
        message: savedMessage.message,
        message_type: savedMessage.message_type,
        is_read: savedMessage.is_read,
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
    
    await db.query(
      'UPDATE chat_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND listing_id = $3',
      [senderId, userId, listingId]
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
    
    // Kullanıcının bu sohbetteki rolünü belirle (sender mı receiver mı)
    const updateQuery = `
      UPDATE chat_messages 
      SET 
        deleted_by_sender = CASE WHEN sender_id = $1 THEN TRUE ELSE deleted_by_sender END,
        deleted_by_receiver = CASE WHEN receiver_id = $1 THEN TRUE ELSE deleted_by_receiver END,
        sender_deleted_at = CASE WHEN sender_id = $1 THEN CURRENT_TIMESTAMP ELSE sender_deleted_at END,
        receiver_deleted_at = CASE WHEN receiver_id = $1 THEN CURRENT_TIMESTAMP ELSE receiver_deleted_at END
      WHERE listing_id = $2 
        AND ((sender_id = $1 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $1))
    `;
    
    const result = await db.query(updateQuery, [userId, listingId, otherUserId]);
    
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