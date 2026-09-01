const WatchLater = require('../models/WatchLater');

// @desc    Get user's Watch Later list
// @route   GET /api/watch-later
// @access  Private
exports.getWatchLater = async (req, res, next) => {
  try {
    const list = await WatchLater.find({ user: req.user._id })
      .populate({
        path: 'video',
        populate: { path: 'creator', select: 'username avatar' },
      })
      .sort('-createdAt');

    // Filter out any entries whose video was deleted
    const valid = list.filter((item) => item.video !== null);

    res.status(200).json({ success: true, count: valid.length, data: valid });
  } catch (err) {
    next(err);
  }
};

// @desc    Add video to Watch Later
// @route   POST /api/watch-later/:videoId
// @access  Private
exports.addToWatchLater = async (req, res, next) => {
  try {
    const entry = await WatchLater.findOneAndUpdate(
      { user: req.user._id, video: req.params.videoId },
      { user: req.user._id, video: req.params.videoId },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    // Duplicate key — already saved
    if (err.code === 11000) {
      return res.status(200).json({ success: true, message: 'Already in Watch Later' });
    }
    next(err);
  }
};

// @desc    Remove video from Watch Later
// @route   DELETE /api/watch-later/:videoId
// @access  Private
exports.removeFromWatchLater = async (req, res, next) => {
  try {
    await WatchLater.findOneAndDelete({ user: req.user._id, video: req.params.videoId });
    res.status(200).json({ success: true, message: 'Removed from Watch Later' });
  } catch (err) {
    next(err);
  }
};

// @desc    Check if a video is in Watch Later
// @route   GET /api/watch-later/check/:videoId
// @access  Private
exports.checkWatchLater = async (req, res, next) => {
  try {
    const entry = await WatchLater.findOne({ user: req.user._id, video: req.params.videoId });
    res.status(200).json({ success: true, saved: !!entry });
  } catch (err) {
    next(err);
  }
};
