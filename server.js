require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./services/database');
const { generalLimiter } = require('./middleware/rateLimiter');
const { authenticateSocketToken } = require('./middleware/auth');
const listingLimitScheduler = require('./services/listingLimitScheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// io'yu global olarak erişilebilir yap
global.io = io;

const PORT = process.env.PORT || 3000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/sections', require('./routes/sections'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/sliders', require('./routes/sliders'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/block', require('./routes/block'));
app.use('/api/watches', require('./routes/watches'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/housing', require('./routes/housing'));
app.use('/api/user-listings', require('./routes/userListings'));
app.use('/api/districts', require('./routes/districts'));
app.use('/api/listing-schedule', require('./routes/listingSchedule'));
app.use('/api/listing-limits', require('./routes/listingLimits'));

// Products route'u watches route'una yönlendir
app.use('/api/products', require('./routes/watches'));

// Mobile listings endpoint'i
app.use('/api/mobile', require('./routes/mobile'));

// Chat için websocket bağlantıları
const connectedUsers = new Map(); // userId -> socketId mapping

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token gerekli'));
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    
    console.log('🔐 Socket authenticated:', {
      userId: decoded.id,
      email: decoded.email,
      socketId: socket.id
    });
    
    next();
  } catch (error) {
    console.error('❌ Socket authentication failed:', error.message);
    next(new Error('Geçersiz token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  connectedUsers.set(socket.userId, socket.id);

  // Kullanıcı bir konuşmaya katıl
  socket.on('joinConversation', (data) => {
    const { otherUserId } = data;
    const roomId = `user_${Math.min(socket.userId, otherUserId)}_${Math.max(socket.userId, otherUserId)}`;
    socket.join(roomId);
    console.log(`👥 User ${socket.userId} joined room ${roomId} (with user ${otherUserId})`);
    
    // Odadaki kullanıcı sayısını göster
    const room = io.sockets.adapter.rooms.get(roomId);
    console.log(`   📊 Room ${roomId} has ${room?.size || 0} users`);
  });

  // Mesaj gönder
  socket.on('sendMessage', async (data) => {
    try {
      const { receiverId, message, messageType = 'text' } = data;
      
      console.log('📨 sendMessage event:', {
        sender: socket.userId,
        receiver: receiverId,
        message: message.substring(0, 20)
      });
      
      // Konuşmayı bul veya oluştur
      const findOrCreateConv = async () => {
        const existing = await db.query(`
          SELECT c.id FROM conversations c
          JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
          JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
          LIMIT 1
        `, [socket.userId, receiverId]);
        
        if (existing.rows.length > 0) {
          console.log('✅ Mevcut konuşma bulundu:', existing.rows[0].id);
          return existing.rows[0].id;
        }
        
        const newConv = await db.query('INSERT INTO conversations (listing_id) VALUES (NULL) RETURNING id');
        const convId = newConv.rows[0].id;
        await db.query('INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)', [convId, socket.userId, receiverId]);
        console.log('✅ Yeni konuşma oluşturuldu:', convId);
        return convId;
      };
      
      const conversationId = await findOrCreateConv();
      
      // Gönderen engellenmiş mi kontrol et
      const isBlockedCheck = await db.query(
        'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
        [receiverId, socket.userId]
      );
      
      const isBlockedMessage = isBlockedCheck.rows.length > 0;
      
      // Mesajı kaydet (WebSocket'te caption yok, sadece text mesajlar)
      const result = await db.query(
        'INSERT INTO messages (conversation_id, sender_id, message, message_type, is_blocked_message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [conversationId, socket.userId, message, messageType, isBlockedMessage]
      );
      
      const savedMessage = result.rows[0];
      console.log('💾 Mesaj kaydedildi:', {
        id: savedMessage.id,
        sender_id: savedMessage.sender_id,
        conversation_id: savedMessage.conversation_id
      });
      
      const roomId = `user_${Math.min(socket.userId, receiverId)}_${Math.max(socket.userId, receiverId)}`;
      
      const messageData = {
        id: savedMessage.id,
        conversation_id: savedMessage.conversation_id,
        sender_id: savedMessage.sender_id,
        receiver_id: receiverId,
        message: savedMessage.message,
        message_type: savedMessage.message_type,
        created_at: savedMessage.created_at
      };
      
      // Gönderen engellenmiş mi kontrol et
      const senderBlockedCheck = await db.query(
        'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
        [receiverId, socket.userId]
      );
      
      if (senderBlockedCheck.rows.length > 0) {
        // Gönderen engellenmiş - sadece gönderene mesajı gönder
        socket.emit('newMessage', messageData);
        console.log('📤 Mesaj sadece gönderene gönderildi (engellenmiş):', {
          sender: savedMessage.sender_id,
          messageId: savedMessage.id
        });
      } else {
        // Normal durum - odadaki herkese mesajı gönder
        io.to(roomId).emit('newMessage', messageData);
        
        const room = io.sockets.adapter.rooms.get(roomId);
        console.log('📤 Mesaj gönderildi:', {
          roomId,
          roomSize: room?.size || 0,
          messageId: savedMessage.id,
          sender: savedMessage.sender_id,
          totalConnected: io.sockets.sockets.size
        });
      }
      
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      socket.emit('error', { message: 'Mesaj gönderilemedi' });
    }
  });

  // Mesajları okundu olarak işaretle
  socket.on('markAsRead', async (data) => {
    try {
      const { senderId } = data;
      
      // Konuşmayı bul
      const findConversation = async () => {
        const existing = await db.query(`
          SELECT c.id FROM conversations c
          JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
          JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
          LIMIT 1
        `, [socket.userId, senderId]);
        
        return existing.rows.length > 0 ? existing.rows[0].id : null;
      };
      
      const conversationId = await findConversation();
      
      if (conversationId) {
        // last_read_at güncelle
        await db.query(
          'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, socket.userId]
        );
      }
    } catch (error) {
      console.error('Mesaj okundu işaretleme hatası:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    connectedUsers.delete(socket.userId);
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Sunucu hatası oluştu'
  });
});

const startServer = async () => {
  try {
    await db.testConnection();
    await db.createTables();
    
    // Listing limit scheduler'ını başlat
    await listingLimitScheduler.start();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server ${PORT} portunda çalışıyor`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      console.log(`💬 WebSocket server aktif`);
      console.log(`⏰ Listing limit scheduler aktif`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      listingLimitScheduler.stop(); // Scheduler'ı durdur
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      listingLimitScheduler.stop(); // Scheduler'ı durdur
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Server başlatma hatası:', error);
    process.exit(1);
  }
};

startServer();