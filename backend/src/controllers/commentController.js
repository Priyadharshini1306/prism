const Comment = require('../models/Comment');
const Video = require('../models/Video');
const Notification = require('../models/Notification');
const { sendRealTimeNotification } = require('../config/socket');

// @desc    Add comment to a video
// @route   POST /api/comments/:videoId
// @access  Private
exports.createComment = async (req, res, next) => {
  try {
    const { message } = req.body;
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const comment = await Comment.create({
      videoId,
      userId: req.user._id,
      message,
    });

    // Populate user details for returning comment instantly
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'username avatar');

    // Send real-time notification to video creator (if commenter is not creator)
    if (video.creator.toString() !== req.user._id.toString()) {
      const notifMessage = `${req.user.username} commented on your video: "${video.title}"`;
      const notification = await Notification.create({
        userId: video.creator,
        message: notifMessage,
        type: 'video',
      });

      sendRealTimeNotification(video.creator, {
        _id: notification._id,
        message: notifMessage,
        type: 'video',
        status: 'unread',
        createdAt: notification.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get comments for a video
// @route   GET /api/comments/:videoId
// @access  Public
exports.getComments = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const comments = await Comment.find({ videoId })
      .populate('userId', 'username avatar')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch (err) {
    next(err);
  }
};
