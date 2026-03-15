import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getProfile,
  updateProfile,
  updateSocialLinks,
  updateSkills,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  updateAvailability,
  updateNotificationPrefs,
  updatePrivacySettings,
  deleteAccount,
  getProfileStats,
  getSavedCreators,
  saveCreator,
  unsaveCreator,
} from '../controllers/userController';

const router = Router();

// ── Public profile ────────────────────────────────────────────
router.get('/:username', optionalAuth, getProfile);
router.get('/:username/stats', authenticate, getProfileStats);

// ── Profile editing (own) ─────────────────────────────────────
router.put(
  '/me/profile',
  authenticate,
  [
    body('display_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('bio').optional().isLength({ max: 2000 }),
    body('location').optional().trim().isLength({ max: 100 }),
    body('languages').optional().isArray(),
    body('hourly_rate').optional().isFloat({ min: 0 }),
    body('availability_status').optional().isIn(['available', 'busy', 'unavailable']),
    body('website').optional().isURL(),
  ],
  validate,
  updateProfile
);

// ── Social links ──────────────────────────────────────────────
router.put(
  '/me/social-links',
  authenticate,
  [
    body().isArray(),
    body('*.platform').isIn(['instagram', 'tiktok', 'youtube', 'twitch', 'twitter', 'linkedin', 'facebook']),
    body('*.url').isURL(),
    body('*.handle').optional().trim(),
    body('*.followers_count').optional().isInt({ min: 0 }),
  ],
  validate,
  updateSocialLinks
);

// ── Skills ────────────────────────────────────────────────────
router.put(
  '/me/skills',
  authenticate,
  [
    body('skill_ids').isArray({ min: 0, max: 20 }),
    body('skill_ids.*').isUUID(),
  ],
  validate,
  updateSkills
);

// ── Portfolio ─────────────────────────────────────────────────
router.post(
  '/me/portfolio',
  authenticate,
  [
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('description').optional().isLength({ max: 2000 }),
    body('cover_url').optional().isURL(),
    body('project_url').optional().isURL(),
    body('tags').optional().isArray(),
  ],
  validate,
  addPortfolioItem
);

router.put('/me/portfolio/:id', authenticate, updatePortfolioItem);
router.delete('/me/portfolio/:id', authenticate, deletePortfolioItem);

// ── Availability ──────────────────────────────────────────────
router.patch(
  '/me/availability',
  authenticate,
  [body('status').isIn(['available', 'busy', 'unavailable'])],
  validate,
  updateAvailability
);

// ── Notification prefs ────────────────────────────────────────
router.put('/me/notification-preferences', authenticate, updateNotificationPrefs);

// ── Privacy settings ──────────────────────────────────────────
router.put('/me/privacy', authenticate, updatePrivacySettings);

// ── Delete account ────────────────────────────────────────────
router.delete(
  '/me',
  authenticate,
  [body('password').optional().notEmpty(), body('confirm').equals('DELETE')],
  validate,
  deleteAccount
);

// ── Saved creators ────────────────────────────────────────────
router.get('/me/saved', authenticate, getSavedCreators);
router.post('/me/saved/:creator_id', authenticate, saveCreator);
router.delete('/me/saved/:creator_id', authenticate, unsaveCreator);

export default router;
