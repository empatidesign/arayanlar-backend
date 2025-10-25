const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserTransactions,
  getTransactionDetails,
  getTransactionStats
} = require('../controllers/transactionsController');

// Kullanıcının işlemlerini getir
router.get('/', authenticateToken, getUserTransactions);

// Belirli bir işlemin detaylarını getir
router.get('/:transactionId', authenticateToken, getTransactionDetails);

// İşlem istatistiklerini getir
router.get('/stats/summary', authenticateToken, getTransactionStats);

module.exports = router;