import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getPreferences, updatePreferences } from '../controllers/preferenceController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getPreferences);
router.put('/', updatePreferences);

export default router;
