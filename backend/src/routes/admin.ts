import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getDashboardStats,
  getUsers,
  getUserDetail,
  updateUserStatus,
  getReports,
  updateReportStatus,
  getProjects,
  featureProject,
  getAnalytics,
  banUser,
  deleteContent,
  getAuditLog,
} from '../controllers/adminController';

const router = Router();

// All admin routes require admin role
router.use(authenticate, requireRole('admin'));

// ── Dashboard ─────────────────────────────────────────────────
router.get('/stats', getDashboardStats);
router.get('/analytics', getAnalytics);

// ── User management ───────────────────────────────────────────
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id/status', updateUserStatus);
router.post('/users/:id/ban', banUser);

// ── Reports ───────────────────────────────────────────────────
router.get('/reports', getReports);
router.patch('/reports/:id', updateReportStatus);

// ── Projects ──────────────────────────────────────────────────
router.get('/projects', getProjects);
router.patch('/projects/:id/feature', featureProject);

// ── Content moderation ────────────────────────────────────────
router.delete('/content/:type/:id', deleteContent);

// ── Audit log ─────────────────────────────────────────────────
router.get('/audit-log', getAuditLog);

export default router;
