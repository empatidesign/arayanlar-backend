const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../controllers/adminController');
const {
  getAllContent,
  getContentByKey,
  adminGetAllContent,
  updateContent,
  createContent,
  deleteContent
} = require('../controllers/appContentController');

// Public routes
router.get('/', getAllContent);
router.get('/:key', getContentByKey);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, adminGetAllContent);
router.post('/admin', authenticateToken, requireAdmin, createContent);
router.put('/admin/:id', authenticateToken, requireAdmin, updateContent);
router.delete('/admin/:id', authenticateToken, requireAdmin, deleteContent);

module.exports = router;
