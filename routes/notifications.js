const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');

// FCM token kaydet
router.post('/fcm-token', authenticateToken, async (req, res) => {
  try {
    const { token, deviceId, deviceType } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    const result = await notificationService.saveFCMToken(userId, token);
    
    res.json({
      success: true,
      message: 'FCM token saved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
});

// FCM token sil
router.delete('/fcm-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    await notificationService.removeFCMToken(userId, token);
    
    res.json({
      success: true,
      message: 'FCM token removed successfully',
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ error: 'Failed to remove FCM token' });
  }
});

// Test bildirimi gönder
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notification = {
      title: '🎉 Test Bildirimi',
      body: 'Arayanvar bildirim sistemi çalışıyor!',
    };

    const data = {
      type: 'test',
      timestamp: new Date().toISOString(),
    };

    const result = await notificationService.sendToUser(userId, notification, data);
    
    res.json({
      success: true,
      message: 'Test notification sent',
      result,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;
