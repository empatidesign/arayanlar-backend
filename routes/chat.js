const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateTokenFlexible } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getConversationMessages,
  getUserConversations,
  sendMessage,
  markMessagesAsRead,
  deleteConversation,
  getChatImage,
  getChatImageByToken
} = require('../controllers/chatController');

// Kullanıcının tüm konuşmalarını listele
router.get('/conversations', authenticateToken, getUserConversations);

// Belirli bir konuşmanın mesajlarını getir (kullanıcı bazlı)
router.get('/conversations/:otherUserId', authenticateToken, getConversationMessages);

// Mesaj gönder
router.post('/send-message', authenticateToken, upload.single('image'), sendMessage);

// Mesajları okundu olarak işaretle
router.post('/mark-read', authenticateToken, markMessagesAsRead);

// Sohbeti sil (sadece kendi tarafında)
router.delete('/conversations/:otherUserId', authenticateToken, deleteConversation);

// Token ile güvenli sohbet resmi erişimi (önce bunu tanımla)
router.get('/image/by-token', authenticateTokenFlexible, getChatImageByToken);

// Güvenli sohbet resmi erişimi (filename)
router.get('/image/:filename', authenticateTokenFlexible, getChatImage);

module.exports = router;