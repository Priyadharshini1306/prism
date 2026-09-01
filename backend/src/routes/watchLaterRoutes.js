const express = require('express');
const {
  getWatchLater,
  addToWatchLater,
  removeFromWatchLater,
  checkWatchLater,
} = require('../controllers/watchLaterController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getWatchLater);
router.get('/check/:videoId', protect, checkWatchLater);
router.post('/:videoId', protect, addToWatchLater);
router.delete('/:videoId', protect, removeFromWatchLater);

module.exports = router;
