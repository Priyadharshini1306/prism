/**
 * clear_videos.js
 * Run this to delete ALL videos from the database.
 * Usage: node clear_videos.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Video = require('./src/models/Video');

const clearVideos = async () => {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/prism');
    console.log('✅ Connected.');

    const result = await Video.deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} video(s) from the database.`);
    console.log('✅ Done! Now only videos you upload will appear.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

clearVideos();
