import '../config/env.js';
import nodemailer from 'nodemailer';

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@noteapp.local';
const DEFAULT_CONNECTION_TIMEOUT_MS = 10000;
const DEFAULT_GREETING_TIMEOUT_MS = 10000;
const DEFAULT_SOCKET_TIMEOUT_MS = 15000;
const EMAIL_TIMEOUT_MESSAGE = 'Email service timeout. Please try again later.';

const parsePort = (value) => {
  const port = Number.parseInt(value || '587', 10);
  return Number.isNaN(port) ? 587 : port;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
};

const getEmailPort = () => parsePort(process.env.EMAIL_PORT || process.env.SMTP_PORT);
const getEmailHost = () => process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
const getEmailSecure = () => parseBoolean(process.env.EMAIL_SECURE, getEmailPort() === 465);

const getEmailCredentials = () => ({
  user: process.env.EMAIL_USER || process.env.SMTP_USER || process.env.ETHEREAL_USER,
  pass: process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.ETHEREAL_PASS,
});

export const getEmailConfigSummary = () => {
  const credentials = getEmailCredentials();

  return {
    EMAIL_HOST: getEmailHost(),
    EMAIL_PORT: getEmailPort(),
    EMAIL_SECURE: getEmailSecure(),
    EMAIL_USER: credentials.user ? 'set' : 'missing',
    EMAIL_PASS: credentials.pass ? 'set' : 'missing',
  };
};

const createTransporter = () => {
  const credentials = getEmailCredentials();
  if (!credentials.user || !credentials.pass) {
    throw new Error('Email credentials are not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env.');
  }

  return nodemailer.createTransport({
    host: getEmailHost(),
    port: getEmailPort(),
    secure: getEmailSecure(),
    auth: credentials,
    connectionTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    greetingTimeout: DEFAULT_GREETING_TIMEOUT_MS,
    socketTimeout: DEFAULT_SOCKET_TIMEOUT_MS,
  });
};

const sendMail = async (mailOptions) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      ...mailOptions,
    });
    return { sent: true, info };
  } catch (error) {
    console.warn('Email was not sent:', error.message);
    return {
      sent: false,
      message: EMAIL_TIMEOUT_MESSAGE,
      error,
    };
  }
};

export const sendActivationEmail = async (email, name, token) => {
  const activationUrl = `${clientUrl}/activate/${token}`;
  const message = `Hi ${name},\n\nPlease activate your account by clicking the link below:\n${activationUrl}\n\nThis link expires in one hour. If you did not request this, ignore this email.`;

  return sendMail({
    to: email,
    subject: 'Activate your NoteSpace account',
    text: message,
    html: `
      <h2>Activate your NoteSpace account</h2>
      <p>Hi ${name},</p>
      <p>Please activate your account by clicking the button below. This link expires in one hour.</p>
      <p><a href="${activationUrl}" style="display:inline-block;padding:12px 18px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:6px;">Activate account</a></p>
      <p>If the button does not work, open this link:</p>
      <p><a href="${activationUrl}">${activationUrl}</a></p>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
};

export const sendResetEmail = async (email, name, token) => {
  const resetUrl = `${clientUrl}/password-reset/confirm?token=${token}`;
  const message = `Hi ${name},\n\nUse the link below to reset your password:\n${resetUrl}\n\nThis link expires in one hour. If you did not request this, ignore this email.`;

  return sendMail({
    to: email,
    subject: 'Reset your NoteSpace password',
    text: message,
    html: `
      <h2>Reset your NoteSpace password</h2>
      <p>Hi ${name},</p>
      <p>Use the button below to reset your password. This link expires in one hour.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:6px;">Reset password</a></p>
      <p>If the button does not work, open this link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
};
