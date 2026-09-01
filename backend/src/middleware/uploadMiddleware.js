const multer = require('multer');

// Use memoryStorage — files land in memory as Buffer, then get uploaded to Google Drive.
// Nothing is written to the local filesystem.
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else if (file.fieldname === 'thumbnail' && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false); // silently reject unknown/mismatched fields
  }
};

const uploadFields = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

// ─── Profile image uploader (avatar + banner) ─────────────────────────────────
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const uploadImages = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per image
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]);

module.exports = { uploadFields, uploadImages };
