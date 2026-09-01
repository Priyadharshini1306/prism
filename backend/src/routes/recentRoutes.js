const express = require('express');
const {
  getRecentlyViewed,
  logRecentlyViewed,
  clearHistory,
  removeFromHistory,
} = require('../controllers/recentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getRecentlyViewed);
router.delete('/', protect, clearHistory);
router.post('/:videoId', protect, logRecentlyViewed);
router.delete('/:videoId', protect, removeFromHistory);

module.exports = router;
