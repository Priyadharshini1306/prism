const express = require('express');
const { notifyGoLive } = require('../controllers/liveController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/live/notify  — call when creator starts broadcasting
router.post('/notify', protect, notifyGoLive);

module.exports = router;
