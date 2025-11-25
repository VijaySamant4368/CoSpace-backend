import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/org-docs';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  }
});

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB each
});
