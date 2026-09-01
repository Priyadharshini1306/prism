const Video = require('../models/Video');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendRealTimeNotification } = require('../config/socket');
const { uploadToDrive, getThumbnailStream, getFileStream, deleteFromDrive, extractFileIdFromUrl } = require('../services/driveService');

console.log('✅ [videoController] NEW Drive-enabled controller loaded');

// Helper: build the backend proxy URL for a thumbnail Drive file ID
const thumbProxyUrl = (fileId) => `/api/videos/thumbnail/${fileId}`;


// @desc    Upload video (and optional thumbnail) → Google Drive
// @route   POST /api/videos/upload
// @access  Private (Creator)
exports.uploadVideo = async (req, res, next) => {
  try {
    const videoFile = req.files?.video?.[0];
    const thumbFile = req.files?.thumbnail?.[0];

    console.log('[Upload] video file received:', videoFile ? `${videoFile.originalname} (${videoFile.size} bytes, buffer length: ${videoFile.buffer?.length})` : 'NONE');
    console.log('[Upload] thumb file received:', thumbFile ? `${thumbFile.originalname} (${thumbFile.size} bytes)` : 'NONE');

    if (!videoFile) {
      return res.status(400).json({ success: false, message: 'Please upload a video file' });
    }

    const { title, description, category, tags } = req.body;

    // ── Upload video to Google Drive ────────────────────────────────────────
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const videoFilename = `video-${unique}-${videoFile.originalname}`;

    console.log('[Upload] Starting Drive upload for video...');
    const { fileId: driveFileId } = await uploadToDrive(
      videoFile.buffer,
      videoFilename,
      videoFile.mimetype
    );
    console.log('[Upload] Video Drive fileId:', driveFileId);

    // ── Upload thumbnail to Google Drive (if provided) ──────────────────────
    let thumbnailUrl = null;
    if (thumbFile) {
      const thumbFilename = `thumb-${unique}-${thumbFile.originalname}`;
      console.log('[Upload] Starting Drive upload for thumbnail...');
      const { fileId: thumbFileId } = await uploadToDrive(
        thumbFile.buffer,
        thumbFilename,
        thumbFile.mimetype
      );
      // Store as backend proxy URL — served via /api/videos/thumbnail/:fileId
      thumbnailUrl = thumbProxyUrl(thumbFileId);
      console.log('[Upload] Thumbnail proxy URL:', thumbnailUrl);
    }

    // ── Save to database ────────────────────────────────────────────────────
    const video = await Video.create({
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      googleDriveFileId: driveFileId,
      thumbnailUrl,
      creator: req.user._id,
      mimeType: videoFile.mimetype,
      size: videoFile.size,
    });

    console.log('[Upload] ✅ Video saved to DB:', video._id.toString());

    // ── Notify subscribers in background ───────────────────────────────────
    setImmediate(async () => {
      try {
        const creator = await User.findById(req.user._id).select('username subscribers');
        if (creator && creator.subscribers && creator.subscribers.length > 0) {
          const message = `${creator.username} uploaded a new video: "${video.title}"`;
          const notifDocs = creator.subscribers.map((subId) => ({
            userId: subId,
            message,
            type: 'video',
            status: 'unread',
            videoId: video._id,
          }));
          await Notification.insertMany(notifDocs);

          // Push real-time socket event to online subscribers
          const notifPayload = {
            message,
            type: 'video',
            videoId: video._id,
            createdAt: new Date(),
          };
          creator.subscribers.forEach((subId) => {
            sendRealTimeNotification(subId.toString(), notifPayload);
          });
          console.log(`[Upload] 🔔 Notified ${creator.subscribers.length} subscriber(s)`);
        }
      } catch (notifErr) {
        console.error('[Upload] Notification fan-out error:', notifErr.message);
      }
    });

    res.status(201).json({ success: true, data: video });
  } catch (err) {
    console.error('[Upload] ❌ Error:', err.message);
    next(err);
  }
};

// @desc    Proxy: serve thumbnail from Google Drive via backend (avoids Drive public URL issues)
// @route   GET /api/videos/thumbnail/:fileId
// @access  Public
exports.serveThumbnail = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { stream, mimeType } = await getThumbnailStream(fileId);
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=86400'); // cache 24h in browser
    stream.pipe(res);
  } catch (err) {
    // Return a 404 so the frontend onError fallback kicks in gracefully
    res.status(404).json({ success: false, message: 'Thumbnail not found' });
  }
};

// @desc    Stream video from Google Drive
// @route   GET /api/videos/stream/:id
// @access  Public
exports.streamVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const range = req.headers.range;
    const fileId = video.googleDriveFileId;

    // ── External HTTP/HTTPS URL (seed/legacy videos) ────────────────────────
    if (fileId.startsWith('http')) {
      const client = fileId.startsWith('https') ? require('https') : require('http');
      const url = require('url');
      const options = url.parse(fileId);
      if (range) options.headers = { Range: range };
      client.get(options, (resp) => {
        res.writeHead(resp.statusCode, resp.headers);
        resp.pipe(res);
      }).on('error', next);
      return;
    }

    // ── Google Drive streaming ───────────────────────────────────────────────
    const { stream, start, end, fileSize, chunksize, mimeType } = await getFileStream(fileId, range);

    if (range) {
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      });
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
    }

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get all videos (with pagination)
// @route   GET /api/videos
// @access  Public
exports.getVideos = async (req, res, next) => {
  try {
    const query = { isPublic: true };

    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }

    if (req.query.creator) {
      query.creator = req.query.creator;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Pagination
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip  = (page - 1) * limit;

    const total  = await Video.countDocuments(query);
    const videos = await Video.find(query)
      .populate('creator', 'username avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: videos.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: videos,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trending videos (most viewed in last 7 days)
// @route   GET /api/videos/trending
// @access  Public
exports.getTrendingVideos = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    const videos = await Video.find({
      isPublic: true,
      createdAt: { $gte: sevenDaysAgo },
    })
      .populate('creator', 'username avatar')
      .sort('-views')
      .limit(limit);

    // Fall back to all-time top if no recent videos exist
    if (videos.length === 0) {
      const fallback = await Video.find({ isPublic: true })
        .populate('creator', 'username avatar')
        .sort('-views')
        .limit(limit);
      return res.status(200).json({ success: true, count: fallback.length, data: fallback });
    }

    res.status(200).json({ success: true, count: videos.length, data: videos });
  } catch (err) {
    next(err);
  }
};

// @desc    Edit a video (title, description, category, thumbnail)
// @route   PATCH /api/videos/:id
// @access  Private (Creator/Owner)
exports.editVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (video.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { title, description, category, tags, isPublic } = req.body;
    const thumbFile = req.files?.thumbnail?.[0];

    if (title)       video.title       = title.trim();
    if (description) video.description = description.trim();
    if (category)    video.category    = category;
    if (tags)        video.tags        = tags.split(',').map(t => t.trim());
    if (typeof isPublic !== 'undefined') video.isPublic = isPublic === 'true' || isPublic === true;

    if (thumbFile) {
      // Delete old thumbnail from Drive if it was a proxy URL
      const oldThumbId = video.thumbnailUrl?.split('/api/videos/thumbnail/')[1];
      if (oldThumbId) await deleteFromDrive(oldThumbId);

      // Upload new thumbnail to Drive
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const thumbFilename = `thumb-${unique}-${thumbFile.originalname}`;
      const { fileId: thumbFileId } = await uploadToDrive(
        thumbFile.buffer,
        thumbFilename,
        thumbFile.mimetype
      );
      video.thumbnailUrl = thumbProxyUrl(thumbFileId);
    }

    await video.save();

    res.status(200).json({ success: true, data: video });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single video
// @route   GET /api/videos/:id
// @access  Public
exports.getVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).populate('creator', 'username avatar subscribers');
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Increment views
    video.views += 1;
    await video.save();

    res.status(200).json({ success: true, data: video });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle like video
// @route   POST /api/videos/:id/like
// @access  Private
exports.likeVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const userId = req.user._id;
    const liked = video.likes.includes(userId);

    if (liked) {
      video.likes = video.likes.filter(id => id.toString() !== userId.toString());
    } else {
      video.likes.push(userId);
      video.dislikes = video.dislikes.filter(id => id.toString() !== userId.toString());
    }

    await video.save();

    res.status(200).json({ success: true, likes: video.likes, dislikes: video.dislikes });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle dislike video
// @route   POST /api/videos/:id/dislike
// @access  Private
exports.dislikeVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const userId = req.user._id;
    const disliked = video.dislikes.includes(userId);

    if (disliked) {
      video.dislikes = video.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      video.dislikes.push(userId);
      video.likes = video.likes.filter(id => id.toString() !== userId.toString());
    }

    await video.save();

    res.status(200).json({ success: true, likes: video.likes, dislikes: video.dislikes });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete video (and remove from Google Drive)
// @route   DELETE /api/videos/:id
// @access  Private
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (video.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this video' });
    }

    // ── Delete video from Google Drive ──────────────────────────────────────
    // Only delete Drive files (not legacy http:// seed videos)
    if (video.googleDriveFileId && !video.googleDriveFileId.startsWith('http')) {
      await deleteFromDrive(video.googleDriveFileId);
    }

    // ── Delete thumbnail from Google Drive ──────────────────────────────────
    const thumbFileId = extractFileIdFromUrl(video.thumbnailUrl);
    if (thumbFileId) {
      await deleteFromDrive(thumbFileId);
    }

    await Video.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Video deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get creator analytics stats
// @route   GET /api/videos/creator/stats
// @access  Private
exports.getCreatorStats = async (req, res, next) => {
  try {
    const videos = await Video.find({ creator: req.user._id });

    let totalViews = 0;
    let totalLikes = 0;
    let totalDislikes = 0;

    const videoStats = videos.map(video => {
      totalViews += video.views;
      totalLikes += video.likes.length;
      totalDislikes += video.dislikes.length;

      return {
        _id: video._id,
        title: video.title,
        views: video.views,
        likes: video.likes.length,
        dislikes: video.dislikes.length,
        category: video.category,
        createdAt: video.createdAt,
      };
    });

    const videoIds = videos.map(v => v._id);
    const analyticsList = await Analytics.find({ videoId: { $in: videoIds } });

    const deviceStats = { desktop: 0, mobile: 0, tablet: 0 };
    let totalWatchTime = 0;

    analyticsList.forEach(a => {
      deviceStats[a.device] = (deviceStats[a.device] || 0) + 1;
      totalWatchTime += a.watchDuration;
    });

    const avgWatchTime = analyticsList.length > 0 ? Math.round(totalWatchTime / analyticsList.length) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalVideos: videos.length,
        totalViews,
        totalLikes,
        totalDislikes,
        subscribersCount: req.user.subscribers.length,
        videoStats,
        deviceStats,
        avgWatchTime,
      }
    });
  } catch (err) {
    next(err);
  }
};
