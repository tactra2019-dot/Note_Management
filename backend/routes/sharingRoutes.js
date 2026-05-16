import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  shareNote,
  getSharedNotes,
  updateSharePermission,
  revokeShare,
  getSharedByMe
} from '../controllers/sharingController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Sharing routes
router.post('/:id/share', shareNote);
router.get('/shared-with-me', getSharedNotes);
router.get('/shared-by-me', getSharedByMe);
router.put('/shared/:id/permission', updateSharePermission);
router.delete('/shared/:id', revokeShare);

export default router;