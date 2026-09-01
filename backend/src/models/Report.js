const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'Spam or misleading',
        'Hateful or abusive content',
        'Harmful or dangerous acts',
        'Child abuse',
        'Promotes terrorism',
        'Nudity or sexual content',
        'Copyright infringement',
        'Other',
      ],
    },
    details: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'actioned'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// One report per user per video
reportSchema.index({ video: 1, reportedBy: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
