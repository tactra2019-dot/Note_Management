import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  activateUser,
  requestPasswordReset,
  resetPassword,
  changePassword,
  resendActivationEmail,
  updateProfile,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';




const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', authenticateToken, logoutUser);
router.get('/activate/:token', activateUser);
router.get('/verify/:token', activateUser);
router.post('/verify/:token', activateUser);
router.post('/password-reset', requestPasswordReset);
router.post('/password-reset/confirm', resetPassword);
router.post('/resend-activation', authenticateToken, resendActivationEmail);
router.post('/change-password', authenticateToken, changePassword);
router.put('/update-profile', authenticateToken, updateProfile);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
