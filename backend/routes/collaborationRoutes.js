import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  joinCollaboration,
  leaveCollaboration,
  getCollaborators,
  validateSession
} from '../controllers/collaborationController.js';

const router = express.Router();

// Session validation doesn't require auth (used by WebSocket)
router.post('/validate-session', validateSession);

// All other routes require authentication
router.use(authenticateToken);

// Collaboration routes
router.post('/:noteId/join', joinCollaboration);
router.delete('/:noteId/leave', leaveCollaboration);
router.get('/:noteId/collaborators', getCollaborators);

export default router;