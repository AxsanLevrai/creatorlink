import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { AppError } from '../middleware/errorHandler';

const logAction = async (adminId: string, action: string, targetType?: string, targetId?: string, metadata?: object) => {
  await query(
    'INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)',
    [adminId, action, targetType, targetId, JSON.stringify(metadata || {})]
  ).catch(() => {});
};

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, projects, messages, reports] = await Promise.all([
      query(`SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '7 days') AS new_7d,
             COUNT(*) FILTER (WHERE status='active') AS active,
             COUNT(*) FILTER (WHERE status='suspended') AS suspended
             FROM users WHERE status!='deleted'`),
      query(`SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status='open') AS open,
             COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '7 days') AS new_7d
             FROM projects`),
      query(`SELECT COUNT(*) AS total FROM messages WHERE created_at > NOW()-INTERVAL '7 days'`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending FROM reports`),
    ]);

    res.json({
      users: users.rows[0],
      projects: projects.rows[0],
      messages_7d: messages.rows[0].total,
      reports: reports.rows[0],
    });
  } catch (err) { next(err); }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const result = await query(
      `SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count
       FROM users WHERE created_at > NOW()-INTERVAL '${Number(days)} days'
       GROUP BY 1 ORDER BY 1`,
      []
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, status, role, page = 1, limit = 25 } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q) { params.push(`%${q}%`); conditions.push(`(u.email ILIKE $${params.length} OR u.username ILIKE $${params.length} OR u.display_name ILIKE $${params.length})`); }
    if (status) { params.push(status); conditions.push(`u.status=$${params.length}`); }
    if (role) { params.push(role); conditions.push(`u.role=$${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const countRes = await query(`SELECT COUNT(*) FROM users u ${where}`, params);
    params.push(Number(limit), offset);

    const dataRes = await query(
      `SELECT u.id, u.email, u.username, u.display_name, u.role, u.status,
              u.avatar_url, u.created_at, u.last_seen_at, u.profile_views,
              u.avg_rating, u.total_reviews
       FROM users u ${where} ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      users: dataRes.rows,
      pagination: { total: Number(countRes.rows[0].count), page: Number(page), limit: Number(limit) },
    });
  } catch (err) { next(err); }
};

export const getUserDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT u.*, 
              (SELECT json_agg(sl) FROM social_links sl WHERE sl.user_id=u.id) AS social_links,
              (SELECT COUNT(*) FROM projects WHERE client_id=u.id) AS project_count,
              (SELECT COUNT(*) FROM applications WHERE creator_id=u.id) AS application_count,
              (SELECT COUNT(*) FROM reviews WHERE reviewee_id=u.id) AS review_count
       FROM users u WHERE u.id=$1`,
      [req.params.id]
    );
    if (!result.rows[0]) throw new AppError('User not found', 404);
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!['active', 'suspended'].includes(status)) throw new AppError('Invalid status', 400);

    await query('UPDATE users SET status=$1, updated_at=NOW() WHERE id=$2', [status, id]);
    await logAction(req.user!.sub, `user_status_${status}`, 'user', id, { reason });
    res.json({ message: `User ${status}` });
  } catch (err) { next(err); }
};

export const banUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await query('UPDATE users SET status=\'suspended\', updated_at=NOW() WHERE id=$1', [id]);
    await logAction(req.user!.sub, 'user_banned', 'user', id, { reason });
    res.json({ message: 'User banned' });
  } catch (err) { next(err); }
};

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status = 'pending', page = 1 } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * 25;
    const result = await query(
      `SELECT r.*,
              json_build_object('id', ru.id, 'username', ru.username, 'email', ru.email) AS reporter,
              CASE WHEN r.reported_user_id IS NOT NULL THEN
                json_build_object('id', u2.id, 'username', u2.username) END AS reported_user
       FROM reports r
       JOIN users ru ON ru.id=r.reporter_id
       LEFT JOIN users u2 ON u2.id=r.reported_user_id
       WHERE r.status=$1 ORDER BY r.created_at DESC LIMIT 25 OFFSET $2`,
      [status, offset]
    );
    res.json({ reports: result.rows });
  } catch (err) { next(err); }
};

export const updateReportStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    await query(
      'UPDATE reports SET status=$1, admin_note=$2, resolved_at=NOW(), resolved_by=$3 WHERE id=$4',
      [status, admin_note, req.user!.sub, id]
    );
    await logAction(req.user!.sub, 'report_resolved', 'report', id, { status });
    res.json({ message: 'Report updated' });
  } catch (err) { next(err); }
};

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, status, page = 1 } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * 25;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q) { params.push(`%${q}%`); conditions.push(`(p.title ILIKE $${params.length})`); }
    if (status) { params.push(status); conditions.push(`p.status=$${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(25, offset);

    const result = await query(
      `SELECT p.id, p.title, p.slug, p.status, p.views, p.applications_count,
              p.budget_fixed, p.budget_min, p.budget_max, p.created_at, p.featured,
              json_build_object('id', u.id, 'username', u.username) AS client
       FROM projects p JOIN users u ON u.id=p.client_id ${where}
       ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ projects: result.rows });
  } catch (err) { next(err); }
};

export const featureProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { featured, days = 7 } = req.body;
    const until = featured ? new Date(Date.now() + Number(days) * 86400000) : null;
    await query('UPDATE projects SET featured=$1, featured_until=$2 WHERE id=$3', [featured, until, id]);
    await logAction(req.user!.sub, featured ? 'project_featured' : 'project_unfeatured', 'project', id);
    res.json({ message: `Project ${featured ? 'featured' : 'unfeatured'}` });
  } catch (err) { next(err); }
};

export const deleteContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, id } = req.params;
    const tables: Record<string, string> = {
      project: 'projects',
      review: 'reviews',
      message: 'messages',
      portfolio: 'portfolio_items',
    };
    const table = tables[type];
    if (!table) throw new AppError('Invalid content type', 400);
    await query(`DELETE FROM ${table} WHERE id=$1`, [id]);
    await logAction(req.user!.sub, 'content_deleted', type, id);
    res.json({ message: 'Content deleted' });
  } catch (err) { next(err); }
};

export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1 } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * 50;
    const result = await query(
      `SELECT al.*, json_build_object('id', u.id, 'username', u.username) AS admin
       FROM admin_audit_log al JOIN users u ON u.id=al.admin_id
       ORDER BY al.created_at DESC LIMIT 50 OFFSET $1`,
      [offset]
    );
    res.json({ log: result.rows });
  } catch (err) { next(err); }
};
