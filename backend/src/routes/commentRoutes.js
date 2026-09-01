const express = require('express');
const { createComment, getComments } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:videoId', getComments);
router.post('/:videoId', protect, createComment);

module.exports = router;
