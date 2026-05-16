import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  shareNote,
  getSharedNotes,
  getSharedByMe,
  updateSharePermission,
  revokeShare,
  getSharedNote,
  updateSharedNote,
} from '../controllers/sharedNoteController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Share a note
router.post('/notes/:id/share', shareNote);

// Get notes shared with me
router.get('/shared-with-me', getSharedNotes);

// Get notes I've shared
router.get('/shared-by-me', getSharedByMe);

// Update share permissions
router.patch('/notes/:noteId/shares/:userId', updateSharePermission);

// Revoke share access
router.delete('/notes/:noteId/shares/:userId', revokeShare);

// Get a specific shared note
router.get('/shared-notes/:id', getSharedNote);

// Update a shared note (if user has edit permission)
router.put('/shared-notes/:id', updateSharedNote);

export default router;