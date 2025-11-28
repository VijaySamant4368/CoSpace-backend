import multer from 'multer';

// Use memoryStorage to keep file in memory instead of disk
const storage = multer.memoryStorage();

const allowed = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
]);

function fileFilter(req, file, cb) {
  if (!allowed.has(file.mimetype)) {
    return cb(new Error('Only PDF or image files allowed'), false);
  }
  cb(null, true);
}

export const uploadDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});
