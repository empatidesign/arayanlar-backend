const db = require('../services/database');

async function migrateChatMessages() {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Chat mesajları migrate ediliyor...');
    
    // Eski chat_messages tablosundan tüm mesajları al
    const oldMessages = await client.query(`
      SELECT DISTINCT ON (listing_id, sender_id, receiver_id)
        listing_id, sender_id, receiver_id
      FROM chat_messages
      ORDER BY listing_id, sender_id, receiver_id, created_at
    `);
    
    console.log(`📊 ${oldMessages.rows.length} farklı konuşma bulundu`);
    
    for (const conv of oldMessages.rows) {
      const { listing_id, sender_id, receiver_id } = conv;
      
      // Konuşma oluştur
      const conversationResult = await client.query(`
        INSERT INTO conversations (listing_id, created_at, updated_at)
        VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [listing_id]);
      
      const conversationId = conversationResult.rows[0].id;
      
      // Katılımcıları ekle
      await client.query(`
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `, [conversationId, sender_id]);
      
      await client.query(`
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `, [conversationId, receiver_id]);
      
      // Bu konuşmaya ait tüm mesajları taşı
      const messages = await client.query(`
        SELECT id, sender_id, message, message_type, created_at
        FROM chat_messages
        WHERE listing_id = $1 
          AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
        ORDER BY created_at
      `, [listing_id, sender_id, receiver_id]);
      
      for (const msg of messages.rows) {
        await client.query(`
          INSERT INTO messages (conversation_id, sender_id, message, message_type, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [conversationId, msg.sender_id, msg.message, msg.message_type, msg.created_at]);
      }
      
      console.log(`✅ Konuşma ${conversationId}: ${messages.rows.length} mesaj taşındı`);
    }
    
    await client.query('COMMIT');
    console.log('✅ Migration tamamlandı!');
    console.log('⚠️  Eski chat_messages tablosunu DROP edebilirsiniz: DROP TABLE chat_messages;');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Çalıştır
migrateChatMessages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
