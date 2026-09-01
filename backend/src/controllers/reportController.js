const Report = require('../models/Report');
const Video = require('../models/Video');

// @desc    Submit a video report
// @route   POST /api/videos/:id/report
// @access  Private
exports.reportVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Cannot report own video
    if (video.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot report your own video' });
    }

    const { reason, details } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for reporting' });
    }

    const report = await Report.findOneAndUpdate(
      { video: req.params.id, reportedBy: req.user._id },
      { video: req.params.id, reportedBy: req.user._id, reason, details },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: report });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reported this video' });
    }
    next(err);
  }
};
