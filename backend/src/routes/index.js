const express = require('express');
const router = express.Router();

const authRoutes          = require('./authRoutes');
const videoRoutes         = require('./videoRoutes');
const commentRoutes       = require('./commentRoutes');
const playlistRoutes      = require('./playlistRoutes');
const notificationRoutes  = require('./notificationRoutes');
const analyticsRoutes     = require('./analyticsRoutes');
const watchLaterRoutes    = require('./watchLaterRoutes');
const recentRoutes        = require('./recentRoutes');
const liveRoutes          = require('./liveRoutes');

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PRISM API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    features: [
      'video-streaming', 'live-streaming', 'watch-party',
      'real-time-chat', 'notifications', 'playlists',
      'analytics', 'watch-later', 'history', 'reports',
    ],
  });
});

router.use('/auth',          authRoutes);
router.use('/videos',        videoRoutes);
router.use('/comments',      commentRoutes);
router.use('/playlists',     playlistRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics',     analyticsRoutes);
router.use('/watch-later',   watchLaterRoutes);
router.use('/recent',        recentRoutes);
router.use('/live',          liveRoutes);

module.exports = router;