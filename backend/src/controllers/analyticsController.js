const Analytics = require('../models/Analytics');
const Video = require('../models/Video');

// @desc    Track playback position heartbeat
// @route   POST /api/analytics/track
// @access  Public (Optional Auth)
exports.trackPlayback = async (req, res, next) => {
  try {
    const { videoId, watchDuration, device, retentionTime } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Video ID is required' });
    }

    const userId = req.user ? req.user._id : null;

    // Find or create analytics record for this user & video session
    let analytics = await Analytics.findOne({ videoId, userId, device });
    
    if (!analytics) {
      analytics = new Analytics({
        videoId,
        userId,
        device: device || 'desktop',
        watchDuration: 0,
        retention: [],
      });
    }

    analytics.watchDuration += parseInt(watchDuration || 0);

    if (retentionTime !== undefined) {
      const roundedTime = Math.round(retentionTime);
      if (!analytics.retention.includes(roundedTime)) {
        analytics.retention.push(roundedTime);
      }
    }

    await analytics.save();

    res.status(200).json({
      success: true,
      message: 'Playback tracked successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get analytics for a specific video
// @route   GET /api/analytics/video/:videoId
// @access  Private (Creator Only)
exports.getVideoAnalytics = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Verify ownership
    if (video.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to view stats for this video' });
    }

    const analyticsRecords = await Analytics.find({ videoId: req.params.videoId });

    // 1. Device Breakdown
    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    let totalWatchTime = 0;

    // 2. Retention Frequency Curve
    const retentionCurve = {};

    analyticsRecords.forEach(record => {
      devices[record.device] = (devices[record.device] || 0) + 1;
      totalWatchTime += record.watchDuration;

      record.retention.forEach(sec => {
        // Group retention in 5-second intervals to smooth out chart
        const interval = Math.floor(sec / 5) * 5;
        retentionCurve[interval] = (retentionCurve[interval] || 0) + 1;
      });
    });

    const averageWatchTime = analyticsRecords.length > 0 ? (totalWatchTime / analyticsRecords.length) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalViews: video.views,
        averageWatchTime: Math.round(averageWatchTime),
        deviceBreakdown: devices,
        retentionCurve,
      },
    });
  } catch (err) {
    next(err);
  }
};
