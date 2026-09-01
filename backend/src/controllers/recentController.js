const RecentlyViewed = require('../models/RecentlyViewed');

// @desc    Get user's recently viewed videos
// @route   GET /api/recent
// @access  Private
exports.getRecentlyViewed = async (req, res, next) => {
  try {
    const list = await RecentlyViewed.find({ user: req.user._id })
      .populate({
        path: 'video',
        populate: { path: 'creator', select: 'username avatar' },
      })
      .sort('-watchedAt')
      .limit(50);

    const valid = list.filter((item) => item.video !== null);

    res.status(200).json({ success: true, count: valid.length, data: valid });
  } catch (err) {
    next(err);
  }
};

// @desc    Log / upsert a recently viewed video
// @route   POST /api/recent/:videoId
// @access  Private
exports.logRecentlyViewed = async (req, res, next) => {
  try {
    await RecentlyViewed.findOneAndUpdate(
      { user: req.user._id, video: req.params.videoId },
      { user: req.user._id, video: req.params.videoId, watchedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear all recently viewed history
// @route   DELETE /api/recent
// @access  Private
exports.clearHistory = async (req, res, next) => {
  try {
    await RecentlyViewed.deleteMany({ user: req.user._id });
    res.status(200).json({ success: true, message: 'History cleared' });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove a single video from history
// @route   DELETE /api/recent/:videoId
// @access  Private
exports.removeFromHistory = async (req, res, next) => {
  try {
    await RecentlyViewed.findOneAndDelete({ user: req.user._id, video: req.params.videoId });
    res.status(200).json({ success: true, message: 'Removed from history' });
  } catch (err) {
    next(err);
  }
};
