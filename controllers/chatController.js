const db = require('../services/database');
const path = require('path');

// Konuşma bul veya oluştur - Kullanıcı bazlı (ilan bağımsız)
const findOrCreateConversation = async (userId, otherUserId) => {
  // İki kullanıcı arasında mevcut konuşmayı bul (ilan bağımsız)
  const existingConv = await db.query(`
    SELECT c.id 
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
    LIMIT 1
  `, [userId, otherUserId]);
  
  if (existingConv.rows.length > 0) {
    return existingConv.rows[0].id;
  }
  
  // Yoksa yeni konuşma oluştur (listing_id null olarak bırakıyoruz çünkü artık kullanıcı bazlı)
  const newConv = await db.query(`
    INSERT INTO conversations (listing_id) VALUES (NULL) RETURNING id
  `);
  
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
    const { otherUserId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query; // Varsayılan limit 10'a düşürüldü
    
    const offset = (page - 1) * limit;
    
    // Önce konuşmanın var olup olmadığını kontrol et (oluşturma!)
    const existingConv = await db.query(`
      SELECT c.id 
      FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
      LIMIT 1
    `, [userId, otherUserId]);
    
    // Eğer conversation yoksa, boş response döndür
    if (existingConv.rows.length === 0) {
      return res.json({
        success: true,
        messages: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0
        }
      });
    }
    
    const conversationId = existingConv.rows[0].id;
    
    const result = await db.query(`
      SELECT 
        m.id,
        m.sender_id,
        m.message,
        m.message_type,
        m.caption,
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
        AND (
          m.sender_id = $2 
          OR (
            NOT EXISTS (
              SELECT 1 FROM blocked_users bu 
              WHERE bu.blocker_id = $2 AND bu.blocked_id = m.sender_id
              AND bu.created_at <= m.created_at
            )
            AND (m.is_blocked_message = FALSE OR m.is_blocked_message IS NULL)
          )
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

// Kullanıcının tüm konuşmalarını listele - Kullanıcı bazlı sistem
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(`
      SELECT DISTINCT
        c.id as conversation_id,
        other_user.id as other_user_id,
        other_user.name as other_user_name,
        other_user.surname as other_user_surname,
        other_user.profile_image_url as other_user_image,
        (
          SELECT 
            CASE 
              WHEN m.message_type = 'image' THEN 
                CASE 
                  WHEN m.caption IS NOT NULL AND m.caption != '' THEN m.caption
                  ELSE 'Resim'
                END
              ELSE m.message 
            END
          FROM messages m
          WHERE m.conversation_id = c.id
            AND (my_part.deleted_at IS NULL OR m.created_at > my_part.deleted_at)
            AND (
              m.sender_id = $1 
              OR (
                NOT EXISTS (
                  SELECT 1 FROM blocked_users bu 
                  WHERE bu.blocker_id = $1 AND bu.blocked_id = m.sender_id
                  AND bu.created_at <= m.created_at
                )
                AND (m.is_blocked_message = FALSE OR m.is_blocked_message IS NULL)
              )
            )
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m.message_type 
          FROM messages m
          WHERE m.conversation_id = c.id
            AND (my_part.deleted_at IS NULL OR m.created_at > my_part.deleted_at)
            AND (
              m.sender_id = $1 
              OR (
                NOT EXISTS (
                  SELECT 1 FROM blocked_users bu 
                  WHERE bu.blocker_id = $1 AND bu.blocked_id = m.sender_id
                  AND bu.created_at <= m.created_at
                )
                AND (m.is_blocked_message = FALSE OR m.is_blocked_message IS NULL)
              )
            )
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_type,
        (
          SELECT m.created_at 
          FROM messages m
          WHERE m.conversation_id = c.id
            AND (my_part.deleted_at IS NULL OR m.created_at > my_part.deleted_at)
            AND (
              m.sender_id = $1 
              OR (
                NOT EXISTS (
                  SELECT 1 FROM blocked_users bu 
                  WHERE bu.blocker_id = $1 AND bu.blocked_id = m.sender_id
                  AND bu.created_at <= m.created_at
                )
                AND (m.is_blocked_message = FALSE OR m.is_blocked_message IS NULL)
              )
            )
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
            AND (
              m.sender_id = $1 
              OR (
                NOT EXISTS (
                  SELECT 1 FROM blocked_users bu 
                  WHERE bu.blocker_id = $1 AND bu.blocked_id = m.sender_id
                  AND bu.created_at <= m.created_at
                )
                AND (m.is_blocked_message = FALSE OR m.is_blocked_message IS NULL)
              )
            )
        ) as unread_count
      FROM conversations c
      JOIN conversation_participants my_part ON c.id = my_part.conversation_id AND my_part.user_id = $1
      JOIN conversation_participants other_part ON c.id = other_part.conversation_id AND other_part.user_id != $1
      JOIN users other_user ON other_part.user_id = other_user.id
      WHERE (
        my_part.deleted_at IS NULL 
        OR EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.conversation_id = c.id 
            AND m.created_at > my_part.deleted_at
        )
      )
      -- Engellenen kullanıcılardan boş sohbetleri gizle
      AND NOT (
        EXISTS (
          SELECT 1 FROM blocked_users bu 
          WHERE bu.blocker_id = $1 AND bu.blocked_id = other_user.id
        )
        AND (
          SELECT m.message 
          FROM messages m
          WHERE m.conversation_id = c.id
            AND (my_part.deleted_at IS NULL OR m.created_at > my_part.deleted_at)
            AND (
              m.sender_id = $1 
              OR (
                NOT EXISTS (
                  SELECT 1 FROM blocked_users bu2 
                  WHERE bu2.blocker_id = $1 AND bu2.blocked_id = m.sender_id
                  AND bu2.created_at <= m.created_at
                )
                AND (m.is_blocked_message = FALSE OR m.is_blocked_message IS NULL)
              )
            )
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) IS NULL
      )
      -- Sadece mesajı olan conversation'ları göster
      AND EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = c.id
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
    const { receiverId, messageType = 'text' } = req.body;
    const userId = req.user.id;
    let message = req.body.message;
    let caption = null;
    
    // Resim kontrolü
    if (req.file && messageType === 'image') {
      caption = message; // Caption'ı sakla
      message = `chat/${req.file.filename}`; // Resim yolunu message'a yaz
    }
    
    // Konuşmayı bul veya oluştur
    const conversationId = await findOrCreateConversation(userId, receiverId);
    
    // Gönderen engellenmiş mi kontrol et
    const isBlockedCheck = await db.query(
      'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [receiverId, userId]
    );
    
    const isBlockedMessage = isBlockedCheck.rows.length > 0;
    
    // Mesajı kaydet
    const result = await db.query(
      'INSERT INTO messages (conversation_id, sender_id, message, message_type, caption, is_blocked_message) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [conversationId, userId, message, messageType, caption, isBlockedMessage]
    );
    
    const savedMessage = result.rows[0];
    
    // Konuşmayı güncelle
    await db.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );
    
    // WebSocket ile mesajı gönder
    if (global.io) {
      const roomId = `user_${Math.min(userId, receiverId)}_${Math.max(userId, receiverId)}`;

      const messageData = {
        id: savedMessage.id,
        conversation_id: savedMessage.conversation_id,
        sender_id: savedMessage.sender_id,
        receiver_id: receiverId,
        message: savedMessage.message,
        message_type: savedMessage.message_type,
        caption: savedMessage.caption,
        created_at: savedMessage.created_at
      };

      // Gönderen engellenmiş mi kontrol et
      if (isBlockedMessage) {
        // Sadece gönderene emit et
        console.log('📤 Mesaj engellenmiş kullanıcıya gönderildi');
      } else {
        // Odadaki herkese emit et
        global.io.to(roomId).emit('newMessage', messageData);
        console.log('✅ Mesaj WebSocket ile gönderildi:', savedMessage.id);
      }
    }
    
    res.json({
      success: true,
      message: 'Mesaj başarıyla gönderildi',
      data: {
        id: savedMessage.id,
        conversation_id: savedMessage.conversation_id,
        sender_id: savedMessage.sender_id,
        message: savedMessage.message,
        message_type: savedMessage.message_type,
        caption: savedMessage.caption,
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
    const { senderId } = req.body;
    const userId = req.user.id;
    
    // Konuşmayı bul
    const conversationId = await findOrCreateConversation(userId, senderId);
    
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
    const { otherUserId } = req.params;
    const userId = req.user.id;
    
    // Konuşmayı bul
    const conversationId = await findOrCreateConversation(userId, otherUserId);
    
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