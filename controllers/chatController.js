const db = require('../services/database');
const path = require('path');
const { encryptText, decryptText, isEncrypted } = require('../utils/messageCrypto');
const fs = require('fs');

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

    const messages = result.rows.reverse().map((row) => {
      const base = {
        ...row,
        message: row.message_type === 'text' ? decryptText(row.message) : row.message,
        caption: row.caption ? decryptText(row.caption) : null,
      };
      if (row.message_type === 'image' && row.message) {
        let plainPath = null;
        try {
          plainPath = isEncrypted(row.message) ? decryptText(row.message) : row.message;
        } catch (e) {
          plainPath = null;
        }
        if (plainPath && plainPath.startsWith('chat/')) {
          try {
            const payload = JSON.stringify({
              p: plainPath,
              mid: row.id,
              cid: conversationId,
              exp: Date.now() + 10 * 60 * 1000 // 10 dakika geçerlilik
            });
            base.image_token = encryptText(payload);
          } catch (e) {
            // token üretilemezse sessizce geç
          }
        }
      }
      return base;
    });

    res.json({
      success: true,
      messages,
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
      AND EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = c.id
      )
      ORDER BY last_message_time DESC NULLS LAST
    `, [userId]);

    const conversations = result.rows.map((row) => ({
      ...row,
      last_message: isEncrypted(row.last_message) ? decryptText(row.last_message) : row.last_message,
    }));

    res.json({
      success: true,
      conversations
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

    // Metin içeriklerini şifrele
    if (messageType === 'text') {
      message = encryptText(message);
    }
    if (caption) {
      caption = encryptText(caption);
    }
    // Görsel yolunu da şifrele
    if (messageType === 'image') {
      message = encryptText(message);
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

    // Image token üretimi (image mesajları için)
    let imageToken = null;
    if (savedMessage.message_type === 'image') {
      try {
        const plainPath = decryptText(savedMessage.message);
        const payload = JSON.stringify({
          p: plainPath,
          mid: savedMessage.id,
          cid: savedMessage.conversation_id,
          exp: Date.now() + 10 * 60 * 1000
        });
        imageToken = encryptText(payload);
      } catch (e) {
        // token üretilemedi, sessiz geç
      }
    }

    // WebSocket ile mesajı gönder
    if (global.io) {
      const roomId = `user_${Math.min(userId, receiverId)}_${Math.max(userId, receiverId)}`;

      const messageData = {
        id: savedMessage.id,
        conversation_id: savedMessage.conversation_id,
        sender_id: savedMessage.sender_id,
        receiver_id: receiverId,
        message: savedMessage.message_type === 'text' ? decryptText(savedMessage.message) : savedMessage.message,
        message_type: savedMessage.message_type,
        caption: savedMessage.caption ? decryptText(savedMessage.caption) : null,
        created_at: savedMessage.created_at
      };
      if (imageToken) {
        messageData.image_token = imageToken;
      }

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
        message: savedMessage.message_type === 'text' ? decryptText(savedMessage.message) : savedMessage.message,
        message_type: savedMessage.message_type,
        caption: savedMessage.caption ? decryptText(savedMessage.caption) : null,
        created_at: savedMessage.created_at,
        ...(imageToken ? { image_token: imageToken } : {})
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

// Token ile güvenli chat resmi erişim endpoint’i
const getChatImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filename } = req.params;

    console.log('[image/by-filename] user:', userId, 'filename:', filename);

    // Dosya adı doğrulama
    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return res.status(400).json({ success: false, message: 'Geçersiz dosya adı' });
    }

    const dbPath = `chat/${filename}`;
    console.log('[image/by-filename] dbPath:', dbPath);

    // Dosyaya karşılık gelen mesajı bul (şifreli kayıtları da destekle)
    let msg = null;
    const msgRes = await db.query(`
      SELECT id, conversation_id, sender_id, message, is_blocked_message, created_at
      FROM messages
      WHERE message_type = 'image' AND message = $1
      LIMIT 1
    `, [dbPath]);

    if (msgRes.rows.length > 0) {
      msg = msgRes.rows[0];
      console.log('[image/by-filename] direct match message id:', msg.id);
    } else {
      const candidatesRes = await db.query(`
        SELECT m.id, m.conversation_id, m.sender_id, m.message, m.is_blocked_message, m.created_at
        FROM messages m
        JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = $1
        WHERE m.message_type = 'image'
        ORDER BY m.created_at DESC
        LIMIT 200
      `, [userId]);
      for (const row of candidatesRes.rows) {
        try {
          const plainPath = isEncrypted(row.message) ? decryptText(row.message) : row.message;
          if (plainPath === dbPath) {
            msg = row;
            console.log('[image/by-filename] encrypted match message id:', msg.id);
            break;
          }
        } catch (e) {
          // ignore decrypt errors
        }
      }
    }

    if (!msg) {
      console.log('[image/by-filename] no matching message for', dbPath);
      return res.status(404).json({ success: false, message: 'Resim bulunamadı' });
    }

    // Konuşma katılımcısı mı?
    const cpRes = await db.query(`
      SELECT deleted_at FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2
      LIMIT 1
    `, [msg.conversation_id, userId]);

    const isAdmin = req.user?.role === 'admin';
    if (cpRes.rows.length === 0 && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
    }

    const deleted_at = cpRes.rows.length > 0 ? cpRes.rows[0].deleted_at : null;

    // Kullanıcı sohbeti kendi tarafında sildiyse ve resim silme zamanından önceyse gösterme
    if (!isAdmin && deleted_at && msg.created_at <= deleted_at) {
      return res.status(404).json({ success: false, message: 'Resim silinmiş' });
    }

    // Engellenmiş mesajı yalnızca gönderen görebilir
    if (!isAdmin && msg.is_blocked_message === true && msg.sender_id !== userId) {
      return res.status(403).json({ success: false, message: 'Engellenmiş mesaj' });
    }

    // Dosya yolu doğrulama ve gönderim
    const chatDir = path.join(__dirname, '..', 'uploads', 'chat');
    const absolutePath = path.resolve(chatDir, filename);
    const safeRoot = path.resolve(chatDir);

    console.log('[image/by-filename] absolutePath:', absolutePath);

    if (!absolutePath.startsWith(safeRoot)) {
      return res.status(400).json({ success: false, message: 'Geçersiz dosya yolu' });
    }

    const exists = fs.existsSync(absolutePath);
    console.log('[image/by-filename] file exists:', exists);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
    }

    // İçerik tipi belirleme
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';

    res.type(mimeType);
    res.set('Cache-Control', 'private, max-age=3600');
    res.set('Content-Disposition', `inline; filename="${filename}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Chat resmi erişim hatası:', error);
    return res.status(500).json({ success: false, message: 'Resim servis hatası' });
  }
};

// Token ile güvenli chat resmi erişim endpoint’i
const getChatImageByToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.query.t;

    console.log('[image/by-token] user:', userId, 'token length:', token ? token.length : 0);

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Token gerekli' });
    }

    let decoded;
    try {
      decoded = decryptText(token);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Geçersiz token' });
    }

    let payload;
    try {
      payload = JSON.parse(decoded);
      console.log('[image/by-token] payload mid:', payload?.mid, 'cid:', payload?.cid, 'p:', payload?.p);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Token formatı hatalı' });
    }

    const { p, mid, cid, exp } = payload || {};

    if (!p || !mid || !cid || !exp) {
      return res.status(400).json({ success: false, message: 'Eksik token bilgisi' });
    }

    if (Date.now() > exp) {
      return res.status(410).json({ success: false, message: 'Token süresi dolmuş' });
    }

    if (typeof p !== 'string' || !p.startsWith('chat/')) {
      return res.status(400).json({ success: false, message: 'Geçersiz yol' });
    }

    const filename = p.split('/')[1];
    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return res.status(400).json({ success: false, message: 'Geçersiz dosya adı' });
    }

    // Mesajı id ile getir ve doğrula
    const msgRes = await db.query(
      `SELECT id, conversation_id, sender_id, message_type, message, is_blocked_message, created_at
       FROM messages WHERE id = $1 LIMIT 1`,
      [mid]
    );

    if (msgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mesaj bulunamadı' });
    }

    const msg = msgRes.rows[0];
    console.log('[image/by-token] message fetched id:', msg.id, 'type:', msg.message_type, 'cid:', msg.conversation_id);

    if (msg.message_type !== 'image') {
      return res.status(400).json({ success: false, message: 'Bu token resim için değil' });
    }

    // Şifreli mesaj yolu ile karşılaştır
    const storedPath = isEncrypted(msg.message) ? decryptText(msg.message) : msg.message;
    console.log('[image/by-token] storedPath:', storedPath, 'payload.p:', p);
    if (msg.conversation_id !== cid || storedPath !== p) {
      return res.status(400).json({ success: false, message: 'Token ile mesaj uyuşmuyor' });
    }

    // Konuşma katılımcısı mı?
    const cpRes = await db.query(
      `SELECT deleted_at FROM conversation_participants
       WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [cid, userId]
    );

    const isAdmin = req.user?.role === 'admin';
    if (cpRes.rows.length === 0 && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
    }

    const deleted_at = cpRes.rows.length > 0 ? cpRes.rows[0].deleted_at : null;

    if (!isAdmin && deleted_at && msg.created_at <= deleted_at) {
      return res.status(404).json({ success: false, message: 'Resim silinmiş' });
    }

    if (!isAdmin && msg.is_blocked_message === true && msg.sender_id !== userId) {
      return res.status(403).json({ success: false, message: 'Engellenmiş mesaj' });
    }

    const chatDir = path.join(__dirname, '..', 'uploads', 'chat');
    const absolutePath = path.resolve(chatDir, filename);
    const safeRoot = path.resolve(chatDir);

    console.log('[image/by-token] absolutePath:', absolutePath);

    if (!absolutePath.startsWith(safeRoot)) {
      return res.status(400).json({ success: false, message: 'Geçersiz dosya yolu' });
    }

    const exists = fs.existsSync(absolutePath);
    console.log('[image/by-token] file exists:', exists);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
    }

    // İçerik tipi belirleme
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';

    res.type(mimeType);
    res.set('Cache-Control', 'private, max-age=600');
    res.set('Content-Disposition', `inline; filename="${filename}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Chat resmi token erişim hatası:', error);
    return res.status(500).json({ success: false, message: 'Resim servis hatası' });
  }
};
module.exports = {
  getConversationMessages,
  getUserConversations,
  sendMessage,
  markMessagesAsRead,
  deleteConversation,
  getChatImage,
  getChatImageByToken
};