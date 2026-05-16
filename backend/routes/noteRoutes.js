import express from 'express';
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  uploadImages,
  deleteImage,
} from '../controllers/noteController.js';
import {
  setNotePassword,
  changeNotePassword,
  removeNotePassword,
  verifyNotePassword,
} from '../controllers/noteProtectionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { uploadNoteImages } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getNotes);
router.post('/', createNote);
router.get('/:id', getNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.patch('/:id/pin', togglePin);
router.post('/:id/images', uploadNoteImages.array('images', 8), uploadImages);
router.delete('/:id/images/:imageId', deleteImage);

// Password protection routes (Phase 5)
router.post('/:id/password', setNotePassword);
router.put('/:id/password', changeNotePassword);
router.delete('/:id/password', removeNotePassword);
router.post('/:id/verify-password', verifyNotePassword);

export default router;
