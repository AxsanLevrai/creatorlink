import { Request, Response, NextFunction } from 'express';
import { query, transaction } from '../db/connection';
import { AppError } from '../middleware/errorHandler';

// ── Get public profile ────────────────────────────────────────
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    const viewerId = req.user?.sub;

    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.banner_url,
              u.location, u.languages, u.role, u.availability_status,
              u.hourly_rate, u.project_rate_min, u.project_rate_max, u.rate_negotiable,
              u.avg_rating, u.total_reviews, u.completed_projects, u.profile_views,
              u.website, u.created_at,
              CASE WHEN u.show_email THEN u.email ELSE NULL END AS email,
              -- Social links
              (SELECT json_agg(sl ORDER BY sl.platform)
               FROM social_links sl WHERE sl.user_id = u.id) AS social_links,
              -- Skills
              (SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'slug', s.slug, 'level', us.level, 'category', s.category))
               FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = u.id) AS skills,
              -- Portfolio
              (SELECT json_agg(pi ORDER BY pi.display_order, pi.created_at DESC)
               FROM portfolio_items pi WHERE pi.user_id = u.id) AS portfolio,
              -- Saved status for viewer
              CASE WHEN $2::uuid IS NOT NULL THEN
                EXISTS(SELECT 1 FROM saved_creators sc WHERE sc.user_id=$2::uuid AND sc.creator_id=u.id)
              ELSE false END AS is_saved
       FROM users u
       WHERE u.username=$1 AND u.status='active' AND u.profile_public=true`,
      [username, viewerId || null]
    );

    if (!result.rows[0]) throw new AppError('Profile not found', 404);
    const profile = result.rows[0];

    // Increment view counter (don't await to keep response fast)
    if (!viewerId || viewerId !== profile.id) {
      query('UPDATE users SET profile_views=profile_views+1 WHERE id=$1', [profile.id]).catch(() => {});
    }

    res.json({ profile });
  } catch (err) {
    next(err);
  }
};

// ── Update profile ────────────────────────────────────────────
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const {
      display_name, bio, location, languages,
      hourly_rate, project_rate_min, project_rate_max,
      rate_negotiable, availability_status, website, response_time,
    } = req.body;

    const result = await query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        bio = COALESCE($2, bio),
        location = COALESCE($3, location),
        languages = COALESCE($4, languages),
        hourly_rate = COALESCE($5, hourly_rate),
        project_rate_min = COALESCE($6, project_rate_min),
        project_rate_max = COALESCE($7, project_rate_max),
        rate_negotiable = COALESCE($8, rate_negotiable),
        availability_status = COALESCE($9, availability_status),
        website = COALESCE($10, website),
        response_time = COALESCE($11, response_time),
        updated_at = NOW()
       WHERE id=$12
       RETURNING id, display_name, bio, location, languages, hourly_rate, availability_status, updated_at`,
      [display_name, bio, location, languages, hourly_rate, project_rate_min, project_rate_max,
       rate_negotiable, availability_status, website, response_time, userId]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── Update social links (replace all) ────────────────────────
export const updateSocialLinks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const links: Array<{ platform: string; url: string; handle?: string; followers_count?: number }> = req.body;

    await transaction(async (client) => {
      await client.query('DELETE FROM social_links WHERE user_id=$1', [userId]);
      for (const link of links) {
        await client.query(
          'INSERT INTO social_links (user_id, platform, url, handle, followers_count) VALUES ($1,$2,$3,$4,$5)',
          [userId, link.platform, link.url, link.handle || null, link.followers_count || 0]
        );
      }
    });

    const updated = await query('SELECT * FROM social_links WHERE user_id=$1 ORDER BY platform', [userId]);
    res.json({ social_links: updated.rows });
  } catch (err) {
    next(err);
  }
};

// ── Update skills ─────────────────────────────────────────────
export const updateSkills = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { skill_ids } = req.body;

    await transaction(async (client) => {
      await client.query('DELETE FROM user_skills WHERE user_id=$1', [userId]);
      for (const skillId of skill_ids) {
        await client.query(
          'INSERT INTO user_skills (user_id, skill_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [userId, skillId]
        );
      }
    });

    res.json({ message: 'Skills updated' });
  } catch (err) {
    next(err);
  }
};

// ── Portfolio CRUD ────────────────────────────────────────────
export const addPortfolioItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { title, description, cover_url, project_url, media_urls, tags, featured } = req.body;

    const result = await query(
      `INSERT INTO portfolio_items (user_id, title, description, cover_url, project_url, media_urls, tags, featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, title, description, cover_url, project_url, media_urls || [], tags || [], featured || false]
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const updatePortfolioItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const { title, description, cover_url, project_url, media_urls, tags, featured, display_order } = req.body;

    const result = await query(
      `UPDATE portfolio_items SET
        title=COALESCE($1,title), description=COALESCE($2,description),
        cover_url=COALESCE($3,cover_url), project_url=COALESCE($4,project_url),
        media_urls=COALESCE($5,media_urls), tags=COALESCE($6,tags),
        featured=COALESCE($7,featured), display_order=COALESCE($8,display_order)
       WHERE id=$9 AND user_id=$10 RETURNING *`,
      [title, description, cover_url, project_url, media_urls, tags, featured, display_order, id, userId]
    );
    if (!result.rows[0]) throw new AppError('Portfolio item not found', 404);
    res.json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const deletePortfolioItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const result = await query('DELETE FROM portfolio_items WHERE id=$1 AND user_id=$2 RETURNING id', [id, userId]);
    if (!result.rows[0]) throw new AppError('Portfolio item not found', 404);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Availability ──────────────────────────────────────────────
export const updateAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    await query('UPDATE users SET availability_status=$1, updated_at=NOW() WHERE id=$2', [status, req.user!.sub]);
    res.json({ availability_status: status });
  } catch (err) {
    next(err);
  }
};

// ── Notification preferences ──────────────────────────────────
export const updateNotificationPrefs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query(
      'UPDATE users SET notification_prefs=$1, updated_at=NOW() WHERE id=$2',
      [JSON.stringify(req.body), req.user!.sub]
    );
    res.json({ notification_prefs: req.body });
  } catch (err) {
    next(err);
  }
};

// ── Privacy settings ──────────────────────────────────────────
export const updatePrivacySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { show_email, show_phone, profile_public } = req.body;
    await query(
      'UPDATE users SET show_email=COALESCE($1,show_email), show_phone=COALESCE($2,show_phone), profile_public=COALESCE($3,profile_public) WHERE id=$4',
      [show_email, show_phone, profile_public, req.user!.sub]
    );
    res.json({ message: 'Privacy settings updated' });
  } catch (err) {
    next(err);
  }
};

// ── Delete account ────────────────────────────────────────────
export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Soft delete
    await query(
      'UPDATE users SET status=\'deleted\', email=NULL, password_hash=NULL, google_id=NULL, updated_at=NOW() WHERE id=$1',
      [req.user!.sub]
    );
    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Profile stats ─────────────────────────────────────────────
export const getProfileStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const [views, applications, messages] = await Promise.all([
      query('SELECT profile_views FROM users WHERE id=$1', [userId]),
      query('SELECT COUNT(*) FROM applications WHERE creator_id=$1', [userId]),
      query(`SELECT COUNT(DISTINCT conversation_id) FROM conversation_participants WHERE user_id=$1`, [userId]),
    ]);
    res.json({
      profile_views: views.rows[0]?.profile_views || 0,
      applications_sent: applications.rows[0]?.count || 0,
      conversations: messages.rows[0]?.count || 0,
    });
  } catch (err) {
    next(err);
  }
};

// ── Saved creators ────────────────────────────────────────────
export const getSavedCreators = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.role,
              u.avg_rating, u.availability_status, sc.created_at AS saved_at
       FROM saved_creators sc JOIN users u ON u.id=sc.creator_id
       WHERE sc.user_id=$1 ORDER BY sc.created_at DESC`,
      [req.user!.sub]
    );
    res.json({ creators: result.rows });
  } catch (err) {
    next(err);
  }
};

export const saveCreator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query(
      'INSERT INTO saved_creators (user_id, creator_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user!.sub, req.params.creator_id]
    );
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
};

export const unsaveCreator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query('DELETE FROM saved_creators WHERE user_id=$1 AND creator_id=$2', [req.user!.sub, req.params.creator_id]);
    res.json({ saved: false });
  } catch (err) {
    next(err);
  }
};
