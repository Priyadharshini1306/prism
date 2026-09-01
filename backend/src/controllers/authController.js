const User = require('../models/User');
const Session = require('../models/Session');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const crypto = require('crypto');
const { uploadToDrive } = require('../services/driveService');


// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Only allow 'user' or 'creator' roles on self-registration (not admin)
    const allowedRole = role === 'creator' ? 'creator' : 'user';

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role: allowedRole,
    });

    sendTokenResponse(user, 201, req, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Logout / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await Session.findOneAndDelete({ refreshToken });
    }

    res.cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Refresh Token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    const session = await Session.findOne({ refreshToken }).populate('userId');
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Check if expired (should be handled by TTL index normally, but double check)
    if (session.expiresAt < new Date()) {
      await Session.findByIdAndDelete(session._id);
      return res.status(401).json({ success: false, message: 'Refresh token expired' });
    }

    const accessToken = generateAccessToken(session.userId._id);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = async (user, statusCode, req, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const deviceIdentifier = crypto.createHash('md5').update(req.get('User-Agent') + req.ip).digest('hex');

  // Upsert session
  await Session.findOneAndUpdate(
    { userId: user._id, deviceIdentifier },
    {
      refreshToken,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    { upsert: true, new: true }
  );

  // Set cookie options
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, options)
    .json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
};

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('subscribers', 'username avatar')
      .populate('subscribedTo', 'username avatar');
    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle subscribe/unsubscribe to a creator
// @route   POST /api/auth/subscribe/:id
// @access  Private
exports.toggleSubscribe = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const creatorId = req.params.id;
    const userId    = req.user._id;

    if (creatorId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot subscribe to yourself' });
    }

    // Validate creatorId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(creatorId)) {
      return res.status(400).json({ success: false, message: 'Invalid creator ID' });
    }

    const creator = await User.findById(creatorId).select('subscribers username');
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    // Check current subscription state
    const isSubscribed = (creator.subscribers || []).some(
      (id) => id.toString() === userId.toString()
    );

    if (isSubscribed) {
      // Unsubscribe — use atomic $pull to avoid save() validation issues
      await User.findByIdAndUpdate(creatorId, { $pull: { subscribers: userId } });
      await User.findByIdAndUpdate(userId, { $pull: { subscribedTo: creatorId } });
    } else {
      // Subscribe — use $addToSet to prevent duplicates
      await User.findByIdAndUpdate(creatorId, { $addToSet: { subscribers: userId } });
      await User.findByIdAndUpdate(userId, { $addToSet: { subscribedTo: creatorId } });
    }

    // Fetch updated count
    const updatedCreator = await User.findById(creatorId).select('subscribers');
    const newSubscriberCount = updatedCreator ? updatedCreator.subscribers.length : 0;

    res.status(200).json({
      success: true,
      isSubscribed: !isSubscribed,
      subscribersCount: newSubscriberCount,
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Get user by ID (Channel Profile)
// @route   GET /api/auth/user/:id
// @access  Public
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile (avatar, bio, bannerImage, website)
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { avatar, bio, bannerImage, website } = req.body;
    const user = await User.findById(req.user._id);

    if (avatar !== undefined)      user.avatar      = avatar.trim();
    if (bio !== undefined)         user.bio         = bio.trim().slice(0, 300);
    if (bannerImage !== undefined) user.bannerImage = bannerImage.trim();
    if (website !== undefined)     user.website     = website.trim();

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        bannerImage: user.bannerImage,
        website: user.website,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all active sessions for the current user
// @route   GET /api/auth/sessions
// @access  Private
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort('-lastActive');
    res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
};

// @desc    Revoke a specific session
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
exports.revokeSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    await Session.findByIdAndDelete(req.params.sessionId);
    res.status(200).json({ success: true, message: 'Session revoked' });
  } catch (err) {
    next(err);
  }
};

// @desc    Revoke all other sessions (keep current)
// @route   DELETE /api/auth/sessions
// @access  Private
exports.revokeAllSessions = async (req, res, next) => {
  try {
    const currentRefreshToken = req.cookies.refreshToken;
    await Session.deleteMany({
      userId: req.user._id,
      refreshToken: { $ne: currentRefreshToken },
    });
    res.status(200).json({ success: true, message: 'All other sessions revoked' });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload profile images (avatar + banner) to Google Drive
// @route   PATCH /api/auth/profile/upload
// @access  Private
exports.uploadProfileImages = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Build update object — start with text fields
    const update = {};
    if (req.body.bio !== undefined)     update.bio     = req.body.bio.trim().slice(0, 300);
    if (req.body.website !== undefined) update.website = req.body.website.trim();

    const imageErrors = [];

    // Handle avatar upload
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      const avatarFile = req.files.avatar[0];
      const filename = `avatar_${user._id}_${Date.now()}${getExtension(avatarFile.originalname)}`;
      try {
        const { publicUrl } = await uploadToDrive(avatarFile.buffer, filename, avatarFile.mimetype);
        update.avatar = publicUrl;
      } catch (driveErr) {
        console.error('❌ Avatar Drive upload failed:', driveErr.message);
        const isAuthError = driveErr.message.includes('401') || driveErr.message.includes('invalid_grant');
        imageErrors.push(
          isAuthError
            ? 'Profile image upload failed: Google Drive token expired. Please re-run setup_oauth.js.'
            : `Profile image upload failed: ${driveErr.message}`
        );
      }
    }

    // Handle banner upload
    if (req.files && req.files.banner && req.files.banner[0]) {
      const bannerFile = req.files.banner[0];
      const filename = `banner_${user._id}_${Date.now()}${getExtension(bannerFile.originalname)}`;
      try {
        const { publicUrl } = await uploadToDrive(bannerFile.buffer, filename, bannerFile.mimetype);
        update.bannerImage = publicUrl;
      } catch (driveErr) {
        console.error('❌ Banner Drive upload failed:', driveErr.message);
        const isAuthError = driveErr.message.includes('401') || driveErr.message.includes('invalid_grant');
        imageErrors.push(
          isAuthError
            ? 'Cover image upload failed: Google Drive token expired. Please re-run setup_oauth.js.'
            : `Cover image upload failed: ${driveErr.message}`
        );
      }
    }

    // Use findByIdAndUpdate to bypass the password pre-save hook entirely
    // (password has select:false so it's undefined in the fetched doc — save() would try to re-hash it)
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, runValidators: false }
    );

    // If there were image errors, return partial success
    if (imageErrors.length > 0) {
      return res.status(207).json({
        success: false,
        partialSuccess: true,
        message: imageErrors.join(' | '),
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
          bannerImage: updatedUser.bannerImage,
          website: updatedUser.website,
        },
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        bannerImage: updatedUser.bannerImage,
        website: updatedUser.website,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Helper: get file extension from original filename
const getExtension = (filename) => {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
};

