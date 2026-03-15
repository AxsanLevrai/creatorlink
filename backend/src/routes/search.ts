import { Router } from 'express';
import { query as queryValidator } from 'express-validator';
import { optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { searchCreators, searchProjects, getSkills, getCategories } from '../controllers/searchController';

const router = Router();

router.get(
  '/creators',
  optionalAuth,
  [
    queryValidator('q').optional().trim(),
    queryValidator('skills').optional(),
    queryValidator('platforms').optional(),
    queryValidator('min_followers').optional().isInt({ min: 0 }),
    queryValidator('max_followers').optional().isInt({ min: 0 }),
    queryValidator('location').optional().trim(),
    queryValidator('language').optional(),
    queryValidator('min_rating').optional().isFloat({ min: 0, max: 5 }),
    queryValidator('max_rate').optional().isFloat({ min: 0 }),
    queryValidator('availability').optional().isIn(['available', 'busy', 'unavailable']),
    queryValidator('sort').optional().isIn(['relevant', 'rating', 'followers', 'newest', 'rate_asc', 'rate_desc']),
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  searchCreators
);

router.get(
  '/projects',
  optionalAuth,
  [
    queryValidator('q').optional().trim(),
    queryValidator('category').optional(),
    queryValidator('status').optional().isIn(['open', 'in_progress', 'completed']),
    queryValidator('platforms').optional(),
    queryValidator('min_budget').optional().isFloat({ min: 0 }),
    queryValidator('max_budget').optional().isFloat({ min: 0 }),
    queryValidator('sort').optional().isIn(['newest', 'budget_asc', 'budget_desc', 'deadline']),
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  searchProjects
);

router.get('/skills', getSkills);
router.get('/categories', getCategories);

export default router;
