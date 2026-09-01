const express = require('express');
const {
  uploadVideo,
  serveThumbnail,
  streamVideo,
  getVideos,
  getTrendingVideos,
  getVideo,
  likeVideo,
  dislikeVideo,
  deleteVideo,
  editVideo,
  getCreatorStats,
} = require('../controllers/videoController');
const { reportVideo } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { uploadFields: upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Public routes — specific routes BEFORE dynamic :id routes
router.get('/', getVideos);
router.get('/trending', getTrendingVideos);
router.get('/stream/:id', streamVideo);
router.get('/thumbnail/:fileId', serveThumbnail); // Backend proxy for Drive thumbnails

// Protected static routes
router.post('/upload', protect, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), uploadVideo);
router.get('/creator/stats', protect, getCreatorStats);

// Dynamic :id routes
router.get('/:id', getVideo);
router.post('/:id/like', protect, likeVideo);
router.post('/:id/dislike', protect, dislikeVideo);
router.delete('/:id', protect, deleteVideo);
router.patch('/:id', protect, upload.fields([{ name: 'thumbnail', maxCount: 1 }]), editVideo);
router.post('/:id/report', protect, reportVideo);

module.exports = router;
