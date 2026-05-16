import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getProfile, updateProfile, uploadAvatarImage } from '../controllers/userController.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/me', getProfile);
router.put('/me', updateProfile);
router.post('/me/avatar', uploadAvatar.single('avatar'), uploadAvatarImage);

export default router;
