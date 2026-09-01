const express = require('express');
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  toggleSubscribe,
  getUserById,
  updateProfile,
  uploadProfileImages,
  getSessions,
  revokeSession,
  revokeAllSessions,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadImages } = require('../middleware/uploadMiddleware');


const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.patch('/profile/upload', protect, uploadImages, uploadProfileImages);

router.post('/subscribe/:id', protect, toggleSubscribe);
router.get('/user/:id', getUserById);

// Session management
router.get('/sessions', protect, getSessions);
router.delete('/sessions', protect, revokeAllSessions);
router.delete('/sessions/:sessionId', protect, revokeSession);

module.exports = router;
