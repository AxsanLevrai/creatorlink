// src/routes/reviews.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { query } from '../db/connection';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../utils/notifications';

const router = Router();

// Get reviews for a user
router.get('/user/:username', optionalAuth, async (req: any, res: any, next: any) => {
  try {
    const { username } = req.params;
    const user = await query('SELECT id FROM users WHERE username=$1', [username]);
    if (!user.rows[0]) throw new AppError('User not found', 404);

    const result = await query(
      `SELECT r.id, r.rating, r.title, r.body, r.created_at,
              json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url) AS reviewer,
              CASE WHEN r.project_id IS NOT NULL THEN json_build_object('id', p.id, 'title', p.title) END AS project
       FROM reviews r JOIN users u ON u.id=r.reviewer_id LEFT JOIN projects p ON p.id=r.project_id
       WHERE r.reviewee_id=$1 AND r.is_public=true ORDER BY r.created_at DESC`,
      [user.rows[0].id]
    );
    res.json({ reviews: result.rows });
  } catch (err) { next(err); }
});

// Submit a review
router.post(
  '/',
  authenticate,
  [
    body('reviewee_id').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('body').trim().isLength({ min: 20, max: 2000 }),
    body('title').optional().trim().isLength({ max: 200 }),
  ],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const { reviewee_id, project_id, rating, title, body } = req.body;
      const reviewerId = req.user.sub;

      if (reviewerId === reviewee_id) throw new AppError('Cannot review yourself', 400);

      const result = await query(
        'INSERT INTO reviews (reviewer_id, reviewee_id, project_id, rating, title, body) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [reviewerId, reviewee_id, project_id || null, rating, title, body]
      );

      await createNotification({
        userId: reviewee_id,
        type: 'new_review',
        title: 'New review received',
        body: `You received a ${rating}-star review`,
        data: { review_id: result.rows[0].id },
      });

      res.status(201).json({ review: result.rows[0] });
    } catch (err) { next(err); }
  }
);

export default router;

// ============================================================
// src/routes/notifications.ts
// ============================================================
import { Router as NRouter } from 'express';
import { authenticate as auth2 } from '../middleware/auth';
import { query as db } from '../db/connection';

export const notificationsRouter = NRouter();

notificationsRouter.get('/', auth2, async (req: any, res: any, next: any) => {
  try {
    const { page = 1 } = req.query;
    const offset = (Number(page) - 1) * 30;
    const result = await db(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30 OFFSET $2',
      [req.user.sub, offset]
    );
    const unread = await db('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND read=false', [req.user.sub]);
    res.json({ notifications: result.rows, unread_count: Number(unread.rows[0].count) });
  } catch (err) { next(err); }
});

notificationsRouter.patch('/read-all', auth2, async (req: any, res: any, next: any) => {
  try {
    await db('UPDATE notifications SET read=true WHERE user_id=$1', [req.user.sub]);
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

notificationsRouter.patch('/:id/read', auth2, async (req: any, res: any, next: any) => {
  try {
    await db('UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.sub]);
    res.json({ read: true });
  } catch (err) { next(err); }
});
