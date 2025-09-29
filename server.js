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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

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
app.use('/api/listings', require('./routes/listings'));
app.use('/api/mobile', require('./routes/mobile')); // Mobile app için ayrı endpoint
app.use('/api/brands', require('./routes/brands'));
app.use('/api/products', require('./routes/products'));
app.use('/api/product-colors', require('./routes/productColors'));
app.use('/api/color-images', require('./routes/colorImages'));
app.use('/api/sliders', require('./routes/sliders'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/block', require('./routes/block'));

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
    next();
  } catch (error) {
    next(new Error('Geçersiz token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  connectedUsers.set(socket.userId, socket.id);

  // Kullanıcı bir konuşmaya katıl
  socket.on('joinConversation', (data) => {
    const { listingId, otherUserId } = data;
    const roomId = `listing_${listingId}_${Math.min(socket.userId, otherUserId)}_${Math.max(socket.userId, otherUserId)}`;
    socket.join(roomId);
    console.log(`User ${socket.userId} joined room ${roomId}`);
  });

  // Mesaj gönder
  socket.on('sendMessage', async (data) => {
    try {
      const { receiverId, listingId, message, messageType = 'text' } = data;
      
      // Mesajı veritabanına kaydet
      const result = await db.query(
        'INSERT INTO chat_messages (sender_id, receiver_id, listing_id, message, message_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [socket.userId, receiverId, listingId, message, messageType]
      );
      
      const savedMessage = result.rows[0];
      const roomId = `listing_${listingId}_${Math.min(socket.userId, receiverId)}_${Math.max(socket.userId, receiverId)}`;
      
      // Odadaki herkese mesajı gönder
      io.to(roomId).emit('newMessage', {
        id: savedMessage.id,
        sender_id: savedMessage.sender_id,
        receiver_id: savedMessage.receiver_id,
        listing_id: savedMessage.listing_id,
        message: savedMessage.message,
        message_type: savedMessage.message_type,
        is_read: savedMessage.is_read,
        created_at: savedMessage.created_at
      });
      
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      socket.emit('error', { message: 'Mesaj gönderilemedi' });
    }
  });

  // Mesajları okundu olarak işaretle
  socket.on('markAsRead', async (data) => {
    try {
      const { senderId, listingId } = data;
      await db.query(
        'UPDATE chat_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND listing_id = $3',
        [senderId, socket.userId, listingId]
      );
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
    
    server.listen(PORT, () => {
      console.log(`🚀 Server ${PORT} portunda çalışıyor`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      console.log(`💬 WebSocket server aktif`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
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