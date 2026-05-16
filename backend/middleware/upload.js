import multer from 'multer';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadRoot = join(__dirname, '..', 'uploads');

const ensureDir = (path) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
};

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype?.startsWith('image/')) {
    cb(new Error('Only image files are allowed.'));
    return;
  }
  cb(null, true);
};

const createImageStorage = (folderName) => {
  const destination = join(uploadRoot, folderName);
  ensureDir(destination);

  return multer.diskStorage({
    destination,
    filename: (req, file, cb) => {
      const extension = extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
    },
  });
};

const limits = {
  fileSize: 5 * 1024 * 1024,
};

export const uploadAvatar = multer({
  storage: createImageStorage('avatars'),
  fileFilter: imageFileFilter,
  limits,
});

export const uploadNoteImages = multer({
  storage: createImageStorage('note-images'),
  fileFilter: imageFileFilter,
  limits,
});
