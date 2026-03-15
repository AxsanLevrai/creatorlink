// ============================================================
// src/routes/projects.ts
// ============================================================
import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createProject, getProject, updateProject, deleteProject,
  getMyProjects, saveProject, unsaveProject,
} from '../controllers/projectController';

const router = Router();

router.get('/mine', authenticate, getMyProjects);
router.get('/:slug', optionalAuth, getProject);
router.post(
  '/',
  authenticate,
  [
    body('title').trim().isLength({ min: 10, max: 200 }),
    body('description').trim().isLength({ min: 30, max: 5000 }),
    body('budget_type').optional().isIn(['fixed', 'range', 'negotiable']),
    body('deadline').optional().isISO8601(),
  ],
  validate,
  createProject
);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);
router.post('/:id/save', authenticate, saveProject);
router.delete('/:id/save', authenticate, unsaveProject);

export default router;
