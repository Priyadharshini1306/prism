const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendRealTimeNotification } = require('../config/socket');

// @desc    Notify subscribers when a creator goes live
// @route   POST /api/live/notify
// @access  Private (Creator)
exports.notifyGoLive = async (req, res, next) => {
  try {
    const creator = await User.findById(req.user._id).select('username subscribers');
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    if (!creator.subscribers || creator.subscribers.length === 0) {
      return res.status(200).json({ success: true, message: 'No subscribers to notify', notified: 0 });
    }

    const message = `${creator.username} is live now! Join the stream.`;

    // Persist notifications to DB for all subscribers
    const notifDocs = creator.subscribers.map((subId) => ({
      userId: subId,
      message,
      type: 'live',
      status: 'unread',
      creatorId: creator._id,
    }));
    await Notification.insertMany(notifDocs);

    // Push real-time socket event to online subscribers
    const notifPayload = {
      message,
      type: 'live',
      creatorId: creator._id,
      createdAt: new Date(),
    };
    creator.subscribers.forEach((subId) => {
      sendRealTimeNotification(subId.toString(), notifPayload);
    });

    console.log(`[Live] 🔔 Notified ${creator.subscribers.length} subscriber(s) that ${creator.username} is live`);

    res.status(200).json({
      success: true,
      message: `Notified ${creator.subscribers.length} subscriber(s)`,
      notified: creator.subscribers.length,
    });
  } catch (err) {
    next(err);
  }
};
