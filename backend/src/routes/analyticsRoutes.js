const express = require('express');
const { trackPlayback, getVideoAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Alias: POST /api/analytics (called from frontend video view)
router.post('/', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
}, trackPlayback);

// Publicly accessible for anonymous tracking
router.post('/track', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
}, trackPlayback);

// Private analytics for specific videos (creators only)
router.get('/video/:videoId', protect, getVideoAnalytics);

module.exports = router;
