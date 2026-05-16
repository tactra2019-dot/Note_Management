import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  setNotePassword,
  verifyNotePassword,
  changeNotePassword
} from '../controllers/noteProtectionController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Password protection routes
router.post('/:id/password', setNotePassword);
router.post('/:id/verify-password', verifyNotePassword);
router.put('/:id/password', changeNotePassword);

export default router;