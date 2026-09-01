const express = require('express');
const {
  createPlaylist,
  getPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
} = require('../controllers/playlistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // all playlist routes are protected

router.route('/')
  .get(getPlaylists)
  .post(createPlaylist);

router.route('/:id')
  .get(getPlaylist)
  .put(updatePlaylist)
  .delete(deletePlaylist);

module.exports = router;
