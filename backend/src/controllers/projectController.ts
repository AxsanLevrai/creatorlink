import { Request, Response, NextFunction } from 'express';
import { query, transaction } from '../db/connection';
import { AppError } from '../middleware/errorHandler';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from '../utils/notifications';

// ── Create project ────────────────────────────────────────────
export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.sub;
    const {
      title, description, requirements, category_id,
      budget_min, budget_max, budget_fixed, budget_type,
      deadline, duration_days, platforms, skills_required,
      tags, min_followers, location_req, language_req,
    } = req.body;

    const baseSlug = slugify(title, { lower: true, strict: true });
    const slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;

    const result = await query(
      `INSERT INTO projects (
        client_id, category_id, title, slug, description, requirements,
        budget_min, budget_max, budget_fixed, budget_type, deadline,
        duration_days, platforms, skills_required, tags, min_followers,
        location_req, language_req, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'open')
      RETURNING *`,
      [clientId, category_id, title, slug, description, requirements,
       budget_min, budget_max, budget_fixed, budget_type || 'fixed', deadline,
       duration_days, platforms || [], skills_required || [], tags || [],
       min_followers, location_req, language_req || []]
    );

    res.status(201).json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── Get single project ────────────────────────────────────────
export const getProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const viewerId = req.user?.sub;

    const result = await query(
      `SELECT p.*,
              json_build_object(
                'id', u.id, 'username', u.username, 'display_name', u.display_name,
                'avatar_url', u.avatar_url, 'avg_rating', u.avg_rating, 'completed_projects', u.completed_projects
              ) AS client,
              json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'icon', c.icon) AS category,
              CASE WHEN $2::uuid IS NOT NULL THEN
                EXISTS(SELECT 1 FROM saved_projects sp WHERE sp.user_id=$2::uuid AND sp.project_id=p.id)
              ELSE false END AS is_saved,
              CASE WHEN $2::uuid IS NOT NULL THEN
                EXISTS(SELECT 1 FROM applications a WHERE a.creator_id=$2::uuid AND a.project_id=p.id)
              ELSE false END AS has_applied
       FROM projects p
       JOIN users u ON u.id=p.client_id
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.slug=$1`,
      [slug, viewerId || null]
    );

    if (!result.rows[0]) throw new AppError('Project not found', 404);

    // Increment views
    query('UPDATE projects SET views=views+1 WHERE slug=$1', [slug]).catch(() => {});

    res.json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── Update project ────────────────────────────────────────────
export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const clientId = req.user!.sub;

    const existing = await query('SELECT client_id, status FROM projects WHERE id=$1', [id]);
    if (!existing.rows[0]) throw new AppError('Project not found', 404);
    if (existing.rows[0].client_id !== clientId && req.user!.role !== 'admin') {
      throw new AppError('Not authorised', 403);
    }

    const {
      title, description, requirements, budget_min, budget_max,
      budget_fixed, deadline, platforms, tags, status,
    } = req.body;

    const result = await query(
      `UPDATE projects SET
        title=COALESCE($1,title), description=COALESCE($2,description),
        requirements=COALESCE($3,requirements), budget_min=COALESCE($4,budget_min),
        budget_max=COALESCE($5,budget_max), budget_fixed=COALESCE($6,budget_fixed),
        deadline=COALESCE($7,deadline), platforms=COALESCE($8,platforms),
        tags=COALESCE($9,tags), status=COALESCE($10,status), updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [title, description, requirements, budget_min, budget_max, budget_fixed, deadline, platforms, tags, status, id]
    );

    res.json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── Delete project ────────────────────────────────────────────
export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const clientId = req.user!.sub;

    const existing = await query('SELECT client_id FROM projects WHERE id=$1', [id]);
    if (!existing.rows[0]) throw new AppError('Project not found', 404);
    if (existing.rows[0].client_id !== clientId && req.user!.role !== 'admin') {
      throw new AppError('Not authorised', 403);
    }

    await query('UPDATE projects SET status=\'cancelled\' WHERE id=$1', [id]);
    res.json({ message: 'Project cancelled' });
  } catch (err) {
    next(err);
  }
};

// ── Get client's own projects ─────────────────────────────────
export const getMyProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.sub;
    const result = await query(
      `SELECT p.*, c.name AS category_name,
              (SELECT COUNT(*) FROM applications a WHERE a.project_id=p.id) AS application_count
       FROM projects p LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.client_id=$1 ORDER BY p.created_at DESC`,
      [clientId]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    next(err);
  }
};

// ── Save / unsave project ─────────────────────────────────────
export const saveProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query(
      'INSERT INTO saved_projects (user_id, project_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user!.sub, req.params.id]
    );
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
};

export const unsaveProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query('DELETE FROM saved_projects WHERE user_id=$1 AND project_id=$2', [req.user!.sub, req.params.id]);
    res.json({ saved: false });
  } catch (err) {
    next(err);
  }
};
