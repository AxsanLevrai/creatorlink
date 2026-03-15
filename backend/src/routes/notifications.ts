// src/routes/notifications.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../db/connection';

const router = Router();

router.get('/', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { page = 1 } = req.query;
    const offset = (Number(page) - 1) * 30;
    const result = await query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30 OFFSET $2',
      [req.user.sub, offset]
    );
    const unread = await query('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND read=false', [req.user.sub]);
    res.json({ notifications: result.rows, unread_count: Number(unread.rows[0].count) });
  } catch (err) { next(err); }
});

router.patch('/read-all', authenticate, async (req: any, res: any, next: any) => {
  try {
    await query('UPDATE notifications SET read=true WHERE user_id=$1', [req.user.sub]);
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

router.patch('/:id/read', authenticate, async (req: any, res: any, next: any) => {
  try {
    await query('UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.sub]);
    res.json({ read: true });
  } catch (err) { next(err); }
});

export default router;
