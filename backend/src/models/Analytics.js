const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    watchDuration: {
      type: Number,
      default: 0, // In seconds
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: 'desktop',
    },
    retention: [Number], // Timestamps user watched (e.g. [10, 20, 30]) in seconds
  },
  { timestamps: true }
);

module.exports = mongoose.model('Analytics', analyticsSchema);
