// src/routes/applications.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { query } from '../db/connection';
import { createNotification } from '../utils/notifications';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Apply to a project
router.post(
  '/',
  authenticate,
  [
    body('project_id').isUUID(),
    body('cover_letter').trim().isLength({ min: 50, max: 3000 }),
    body('proposed_rate').optional().isFloat({ min: 0 }),
  ],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const { project_id, cover_letter, proposed_rate, proposed_timeline, portfolio_urls } = req.body;
      const creatorId = req.user.sub;

      // Check project exists and is open
      const proj = await query('SELECT id, client_id, title FROM projects WHERE id=$1 AND status=\'open\'', [project_id]);
      if (!proj.rows[0]) throw new AppError('Project not found or not accepting applications', 404);
      if (proj.rows[0].client_id === creatorId) throw new AppError('Cannot apply to your own project', 400);

      const result = await query(
        `INSERT INTO applications (project_id, creator_id, cover_letter, proposed_rate, proposed_timeline, portfolio_urls)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [project_id, creatorId, cover_letter, proposed_rate, proposed_timeline, portfolio_urls || []]
      );

      // Notify client
      const creator = await query('SELECT display_name FROM users WHERE id=$1', [creatorId]);
      await createNotification({
        userId: proj.rows[0].client_id,
        type: 'project_application',
        title: `New application for "${proj.rows[0].title}"`,
        body: `${creator.rows[0]?.display_name} applied to your project`,
        data: { project_id, application_id: result.rows[0].id },
      });

      res.status(201).json({ application: result.rows[0] });
    } catch (err) { next(err); }
  }
);

// Get applications for a project (client only)
router.get('/project/:project_id', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { project_id } = req.params;
    const proj = await query('SELECT client_id FROM projects WHERE id=$1', [project_id]);
    if (!proj.rows[0] || (proj.rows[0].client_id !== req.user.sub && req.user.role !== 'admin')) {
      throw new AppError('Not authorised', 403);
    }
    const result = await query(
      `SELECT a.*,
              json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name,
              'avatar_url', u.avatar_url, 'avg_rating', u.avg_rating, 'completed_projects', u.completed_projects) AS creator
       FROM applications a JOIN users u ON u.id=a.creator_id
       WHERE a.project_id=$1 ORDER BY a.created_at DESC`,
      [project_id]
    );
    res.json({ applications: result.rows });
  } catch (err) { next(err); }
});

// Get my applications (creator)
router.get('/mine', authenticate, async (req: any, res: any, next: any) => {
  try {
    const result = await query(
      `SELECT a.*, json_build_object('id', p.id, 'title', p.title, 'slug', p.slug, 'status', p.status) AS project
       FROM applications a JOIN projects p ON p.id=a.project_id
       WHERE a.creator_id=$1 ORDER BY a.created_at DESC`,
      [req.user.sub]
    );
    res.json({ applications: result.rows });
  } catch (err) { next(err); }
});

// Update application status (client)
router.patch('/:id/status', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) throw new AppError('Invalid status', 400);

    const app = await query(
      `SELECT a.*, p.client_id, p.title FROM applications a JOIN projects p ON p.id=a.project_id WHERE a.id=$1`,
      [req.params.id]
    );
    if (!app.rows[0]) throw new AppError('Application not found', 404);
    if (app.rows[0].client_id !== req.user.sub) throw new AppError('Not authorised', 403);

    await query('UPDATE applications SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id]);

    await createNotification({
      userId: app.rows[0].creator_id,
      type: status === 'accepted' ? 'application_accepted' : 'application_rejected' as any,
      title: `Application ${status}`,
      body: `Your application for "${app.rows[0].title}" was ${status}`,
      data: { project_id: app.rows[0].project_id },
    });

    res.json({ message: `Application ${status}` });
  } catch (err) { next(err); }
});

export default router;
