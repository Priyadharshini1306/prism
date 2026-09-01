const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    googleDriveFileId: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: 'https://placehold.co/1280x720/0a0a0a/purple?text=PRISM+Video',
    },
    duration: {
      type: String,
      default: '0:00',
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Entertainment',
        'Gaming',
        'Education',
        'Music',
        'Tech',
        'Vlogs',
        'Other',
      ],
      default: 'Other',
    },
    tags: [String],
    isPublic: {
      type: Boolean,
      default: true,
    },
    mimeType: String,
    size: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Video', videoSchema);
