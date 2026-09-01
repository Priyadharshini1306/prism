const Playlist = require('../models/Playlist');

// @desc    Create a playlist
// @route   POST /api/playlists
// @access  Private
exports.createPlaylist = async (req, res, next) => {
  try {
    const { name, videoId } = req.body;

    const playlist = await Playlist.create({
      userId: req.user._id,
      name,
      videos: videoId ? [videoId] : [],
    });

    res.status(201).json({
      success: true,
      data: playlist,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user playlists
// @route   GET /api/playlists
// @access  Private
exports.getPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ userId: req.user._id })
      .populate('videos')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: playlists.length,
      data: playlists,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single playlist
// @route   GET /api/playlists/:id
// @access  Private
exports.getPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate({
      path: 'videos',
      populate: {
        path: 'creator',
        select: 'username avatar',
      },
    });

    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update playlist (add/remove video)
// @route   PUT /api/playlists/:id
// @access  Private
exports.updatePlaylist = async (req, res, next) => {
  try {
    const { videoId, action } = req.body;
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.user._id });

    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    if (action === 'add') {
      if (!playlist.videos.includes(videoId)) {
        playlist.videos.push(videoId);
      }
    } else if (action === 'remove') {
      playlist.videos = playlist.videos.filter(id => id.toString() !== videoId.toString());
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use add or remove.' });
    }

    await playlist.save();

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete playlist
// @route   DELETE /api/playlists/:id
// @access  Private
exports.deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Playlist deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
