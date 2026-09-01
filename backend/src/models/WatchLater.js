const mongoose = require('mongoose');

const watchLaterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can only save a video once
watchLaterSchema.index({ user: 1, video: 1 }, { unique: true });

module.exports = mongoose.model('WatchLater', watchLaterSchema);
