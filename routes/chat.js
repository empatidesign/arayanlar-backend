const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getConversationMessages,
  getUserConversations,
  sendMessage,
  markMessagesAsRead,
  deleteConversation
} = require('../controllers/chatController');

// Kullanıcının tüm konuşmalarını listele
router.get('/conversations', authenticateToken, getUserConversations);

// Belirli bir konuşmanın mesajlarını getir
router.get('/conversations/:listingId/:otherUserId', authenticateToken, getConversationMessages);

// Mesaj gönder
router.post('/send-message', authenticateToken, upload.single('image'), sendMessage);

// Mesajları okundu olarak işaretle
router.post('/mark-read', authenticateToken, markMessagesAsRead);

// Sohbeti sil (sadece kendi tarafında)
router.delete('/conversations/:listingId/:otherUserId', authenticateToken, deleteConversation);

module.exports = router;