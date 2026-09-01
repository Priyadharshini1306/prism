/**
 * Migration: Fix Drive thumbnail URLs → backend proxy URLs
 * Changes any Drive URL (uc?export=view or lh3.googleusercontent.com)
 * to our backend proxy: /api/videos/thumbnail/FILE_ID
 *
 * Run: node fix_thumbnails.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const Video = require('./src/models/Video');
  const all = await Video.find({});

  let updated = 0;
  for (const video of all) {
    const url = video.thumbnailUrl || '';

    // Extract Drive file ID from either old URL format
    let fileId = null;

    // Format 1: https://drive.google.com/uc?export=view&id=FILE_ID
    const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) fileId = ucMatch[1];

    // Format 2: https://lh3.googleusercontent.com/d/FILE_ID
    if (!fileId) {
      const lhMatch = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
      if (lhMatch) fileId = lhMatch[1];
    }

    if (fileId) {
      const newUrl = `/api/videos/thumbnail/${fileId}`;
      console.log(`  "${video.title}"`);
      console.log(`    Old: ${url}`);
      console.log(`    New: ${newUrl}\n`);
      video.thumbnailUrl = newUrl;
      await video.save();
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} thumbnail URL(s)`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
