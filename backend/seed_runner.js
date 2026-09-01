const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Video = require('./src/models/Video');
const User = require('./src/models/User');

const SEED_VIDEOS = [
  {
    title: 'Big Buck Bunny (Animation)',
    description: 'A large and lovable rabbit deals with pesky forest creatures in this classic open-source film.',
    googleDriveFileId: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    category: 'Gaming',
    views: 1420,
    likes: [],
    dislikes: [],
    mimeType: 'video/mp4'
  },
  {
    title: 'Sintel - Sci-Fi Adventure',
    description: 'A search for a baby dragon leads a lone warrior girl on an emotional and beautiful journey.',
    googleDriveFileId: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    category: 'Entertainment',
    views: 950,
    likes: [],
    dislikes: [],
    mimeType: 'video/mp4'
  },
  {
    title: 'Tears of Steel (Sci-Fi VFX)',
    description: 'A sci-fi action film featuring giant robots and stunning visual effects set in Amsterdam.',
    googleDriveFileId: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    category: 'Tech',
    views: 2310,
    likes: [],
    dislikes: [],
    mimeType: 'video/mp4'
  },
  {
    title: 'Elephants Dream (Surreal)',
    description: 'Two characters explore a giant, mysterious machine world in this surreal sci-fi classic.',
    googleDriveFileId: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    category: 'Education',
    views: 640,
    likes: [],
    dislikes: [],
    mimeType: 'video/mp4'
  }
];

const runSeeder = async () => {
  try {
    // 1. Ensure at least one creator exists
    let creator = await User.findOne({ role: 'creator' });
    if (!creator) {
      console.log('🌱 Creating default Creator user account...');
      const hashedPassword = await bcrypt.hash('password123', 12);
      creator = await User.create({
        username: 'prism_creator',
        email: 'creator@prism.com',
        password: hashedPassword,
        role: 'creator',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=prism_creator'
      });
      console.log('✅ Creator account created! Email: creator@prism.com | Password: password123');
    }

    // 2. Insert videos if none exist
    const videoCount = await Video.countDocuments();
    if (videoCount === 0) {
      console.log('🌱 Seeding default videos list...');
      const videosWithCreator = SEED_VIDEOS.map(video => ({
        ...video,
        creator: creator._id,
        likes: [creator._id],
      }));
      
      const inserted = await Video.insertMany(videosWithCreator);
      console.log(`✅ Successfully seeded ${inserted.length} videos into local database!`);
    } else {
      console.log(`ℹ️ Local database already has ${videoCount} videos.`);
    }
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  }
};

// Run after a short delay to ensure db connection is fully ready
setTimeout(runSeeder, 3000);
