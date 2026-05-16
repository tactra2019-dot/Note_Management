import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { sendActivationEmail, sendResetEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 10;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const mapUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.display_name,
  avatarUrl: user.avatar_url || null,
  isActive: Boolean(user.is_active),
});

export const registerUser = async (req, res) => {
  const { email, displayName, password, confirmPassword } = req.body;

  if (!email || !displayName || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters long.' });
  }

  const normalizedEmail = email.toLowerCase();
  const [existingRows] = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existingRows.length > 0) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const activationToken = crypto.randomBytes(32).toString('hex');

  const [result] = await db.query(
    `INSERT INTO users
      (email, display_name, password_hash, is_active, activation_token, activation_token_expires, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW(), NOW())`,
    [normalizedEmail, displayName.trim(), passwordHash, false, activationToken],
  );

  const user = {
    id: result.insertId,
    email: normalizedEmail,
    display_name: displayName.trim(),
    avatar_url: null,
    is_active: false,
  };

  const token = signToken(user);
  const emailResult = await sendActivationEmail(user.email, user.display_name, activationToken);

  if (!emailResult.sent) {
    return res.status(201).json({
      success: true,
      message: 'Account created, but activation email could not be sent. Please resend later.',
      emailSent: false,
      token,
      user: mapUser(user),
    });
  }

  res.status(201).json({
    success: true,
    message: 'Account created. Please check your inbox for the activation link.',
    emailSent: true,
    token,
    user: mapUser(user),
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const [rows] = await db.query(
    'SELECT id, email, display_name, avatar_url, password_hash, is_active FROM users WHERE email = ?',
    [email.toLowerCase()],
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = signToken(user);
  res.json({ token, user: mapUser(user) });
};

export const logoutUser = async (req, res) => {
  res.json({ message: 'Logged out successfully.' });
};

export const getCurrentUser = async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, email, display_name, avatar_url, is_active FROM users WHERE id = ?',
    [req.user.id],
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ message: 'User not found.' });

  res.json({ user: mapUser(user) });
};

export const activateUser = async (req, res) => {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({ message: 'Activation token is required.' });
  }

  const [rows] = await db.query(
    'SELECT id FROM users WHERE activation_token = ? AND is_active = false AND activation_token_expires > NOW()',
    [token],
  );
  const user = rows[0];
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired activation link.' });
  }

  await db.query(
    'UPDATE users SET is_active = true, activation_token = NULL, activation_token_expires = NULL, updated_at = NOW() WHERE id = ?',
    [user.id],
  );
  res.json({ message: 'Account activated successfully.' });
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const normalizedEmail = email.toLowerCase();
  const [rows] = await db.query('SELECT id, display_name FROM users WHERE email = ?', [normalizedEmail]);
  const user = rows[0];
  if (!user) return res.status(200).json({ message: 'If the email exists, a reset link was sent.' });

  const resetToken = crypto.randomBytes(32).toString('hex');

  await db.query(
    'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR), updated_at = NOW() WHERE id = ?',
    [resetToken, user.id],
  );
  await sendResetEmail(normalizedEmail, user.display_name, resetToken);

  res.json({ message: 'If the email exists, a reset link was sent.' });
};

export const resendActivationEmail = async (req, res) => {
  let emailResult = null;
  let emailAttempted = false;

  try {
    const [rows] = await db.query(
      'SELECT id, email, display_name, avatar_url, is_active FROM users WHERE id = ?',
      [req.user.id],
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.is_active) {
      return res.json({ success: true, message: 'Your account is already activated.' });
    }

    const activationToken = crypto.randomBytes(32).toString('hex');
    await db.query(
      'UPDATE users SET activation_token = ?, activation_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR), updated_at = NOW() WHERE id = ?',
      [activationToken, user.id],
    );

    emailAttempted = true;
    emailResult = await sendActivationEmail(user.email, user.display_name, activationToken);
    if (!emailResult.sent) {
      return res.status(503).json({
        success: false,
        message: 'Email service timeout. Please try again later.',
      });
    }

    return res.json({
      success: true,
      message: 'Activation email sent. Please check your inbox.',
    });
  } catch (error) {
    if (!emailAttempted) {
      throw error;
    }

    console.warn('Resend activation email failed:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Email service timeout. Please try again later.',
    });
  } finally {
    emailResult = null;
  }
};

export const resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Token and passwords are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters long.' });
  }

  const [rows] = await db.query(
    'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
    [token],
  );
  const user = rows[0];
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset token.' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await db.query(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = ?',
    [passwordHash, user.id],
  );

  res.json({ message: 'Password changed successfully. Please log in again.' });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New passwords do not match.' });
  }
  if (newPassword.trim().length < 4) {
    return res.status(400).json({ message: 'New password must be at least 4 characters long.' });
  }

  const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const user = rows[0];
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, req.user.id]);

  res.json({ message: 'Password updated successfully.' });
};

export const updateProfile = async (req, res) => {
  const { displayName, avatarUrl } = req.body;
  const userId = req.user.id;

  if (displayName !== undefined && displayName.trim() === '') {
    return res.status(400).json({ message: 'Display name is required.' });
  }

  await db.query(
    `UPDATE users
     SET display_name = COALESCE(?, display_name),
         avatar_url = COALESCE(?, avatar_url),
         updated_at = NOW()
     WHERE id = ?`,
    [displayName?.trim() || null, avatarUrl || null, userId],
  );

  const [rows] = await db.query(
    'SELECT id, email, display_name, avatar_url, is_active FROM users WHERE id = ?',
    [userId],
  );

  res.json({
    user: mapUser(rows[0]),
    message: 'Profile updated successfully.',
  });
};
