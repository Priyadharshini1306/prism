const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
    },
    deviceIdentifier: {
      type: String,
      required: true,
    },
    userAgent: String,
    ipAddress: String,
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically delete when expired
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
