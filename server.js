require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./services/database');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
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
app.use('/api/listings', require('./routes/listings'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/products', require('./routes/products'));
app.use('/api/products', require('./routes/productColors'));
app.use('/api/color-images', require('./routes/colorImages'));
app.use('/api/admin', require('./routes/admin'));

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
    
    app.listen(PORT, () => {
      console.log(`🚀 Server ${PORT} portunda çalışıyor`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
    });
  } catch (error) {
    console.error('❌ Server başlatma hatası:', error);
    process.exit(1);
  }
};

startServer();