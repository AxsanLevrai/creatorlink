import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  getMe,
  refreshToken,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  googleCallback,
  changePassword,
  changeEmail,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, try again in 15 minutes.' },
});

// ── Registration ─────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
      .withMessage('Password must be at least 8 characters and contain a letter and number'),
    body('username')
      .isAlphanumeric('en-US', { ignore: '_-' })
      .isLength({ min: 3, max: 30 })
      .toLowerCase(),
    body('role').isIn(['creator', 'client']),
    body('display_name').trim().isLength({ min: 2, max: 100 }),
  ],
  validate,
  register
);

// ── Login ─────────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  login
);

// ── Google OAuth ──────────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=oauth` }),
  googleCallback
);

// ── Token refresh ─────────────────────────────────────────────
router.post('/refresh', refreshToken);

// ── Email verification ────────────────────────────────────────
router.get('/verify-email/:token', verifyEmail);

// ── Password reset ────────────────────────────────────────────
router.post(
  '/request-reset',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  validate,
  requestPasswordReset
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty(),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/),
  ],
  validate,
  resetPassword
);

// ── Authenticated routes ──────────────────────────────────────
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

router.put(
  '/change-password',
  authenticate,
  [
    body('current_password').notEmpty(),
    body('new_password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/),
  ],
  validate,
  changePassword
);

router.put(
  '/change-email',
  authenticate,
  authLimiter,
  [body('new_email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  changeEmail
);

export default router;
