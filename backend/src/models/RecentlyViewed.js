const mongoose = require('mongoose');

const recentlyViewedSchema = new mongoose.Schema(
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
    watchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index: efficient per-user lookup and prevent duplicates
recentlyViewedSchema.index({ user: 1, video: 1 }, { unique: true });
// TTL: auto-delete after 30 days
recentlyViewedSchema.index({ watchedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('RecentlyViewed', recentlyViewedSchema);
