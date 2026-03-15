import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';

const DEFAULT_LIMIT = 20;

export const searchCreators = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q, skills, platforms, min_followers, max_followers,
      location, language, min_rating, max_rate,
      availability, sort = 'relevant',
      page = 1, limit = DEFAULT_LIMIT,
    } = req.query as Record<string, string>;

    const offset = (Number(page) - 1) * Number(limit);
    const params: unknown[] = [];
    const conditions: string[] = ["u.status='active'", "u.profile_public=true"];
    const joins: string[] = [];

    // Full-text search
    if (q) {
      params.push(q);
      conditions.push(`(
        to_tsvector('english', coalesce(u.display_name,'') || ' ' || coalesce(u.bio,'') || ' ' || coalesce(u.location,''))
        @@ plainto_tsquery('english', $${params.length})
        OR u.username ILIKE '%' || $${params.length} || '%'
      )`);
    }

    // Skills filter
    if (skills) {
      const skillList = skills.split(',').map(s => s.trim());
      params.push(skillList);
      joins.push(`JOIN user_skills us ON us.user_id=u.id JOIN skills sk ON sk.id=us.skill_id AND sk.slug=ANY($${params.length}::text[])`);
    }

    // Platforms / social links
    if (platforms) {
      const platformList = platforms.split(',').map(p => p.trim());
      params.push(platformList);
      conditions.push(`EXISTS(SELECT 1 FROM social_links sl WHERE sl.user_id=u.id AND sl.platform=ANY($${params.length}::text[]))`);
    }

    // Followers range
    if (min_followers || max_followers) {
      const followerSubquery = `(SELECT COALESCE(SUM(sl.followers_count),0) FROM social_links sl WHERE sl.user_id=u.id)`;
      if (min_followers) {
        params.push(Number(min_followers));
        conditions.push(`${followerSubquery} >= $${params.length}`);
      }
      if (max_followers) {
        params.push(Number(max_followers));
        conditions.push(`${followerSubquery} <= $${params.length}`);
      }
    }

    // Location
    if (location) {
      params.push(`%${location}%`);
      conditions.push(`u.location ILIKE $${params.length}`);
    }

    // Language
    if (language) {
      params.push(language);
      conditions.push(`$${params.length}=ANY(u.languages)`);
    }

    // Min rating
    if (min_rating) {
      params.push(Number(min_rating));
      conditions.push(`u.avg_rating >= $${params.length}`);
    }

    // Max rate
    if (max_rate) {
      params.push(Number(max_rate));
      conditions.push(`(u.hourly_rate <= $${params.length} OR u.hourly_rate IS NULL)`);
    }

    // Availability
    if (availability) {
      params.push(availability);
      conditions.push(`u.availability_status=$${params.length}`);
    }

    // Sort
    const sortMap: Record<string, string> = {
      relevant: q ? `ts_rank(to_tsvector('english', coalesce(u.display_name,'') || ' ' || coalesce(u.bio,'')), plainto_tsquery('english', '${q}')) DESC` : 'u.avg_rating DESC',
      rating: 'u.avg_rating DESC, u.total_reviews DESC',
      followers: '(SELECT COALESCE(SUM(sl.followers_count),0) FROM social_links sl WHERE sl.user_id=u.id) DESC',
      newest: 'u.created_at DESC',
      rate_asc: 'u.hourly_rate ASC NULLS LAST',
      rate_desc: 'u.hourly_rate DESC NULLS LAST',
    };

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await query(
      `SELECT COUNT(DISTINCT u.id) FROM users u ${joins.join(' ')} ${whereClause}`,
      params
    );
    const total = Number(countResult.rows[0]?.count || 0);

    // Main query
    params.push(Number(limit), offset);
    const dataResult = await query(
      `SELECT DISTINCT u.id, u.username, u.display_name, u.avatar_url, u.bio,
              u.location, u.availability_status, u.avg_rating, u.total_reviews,
              u.hourly_rate, u.completed_projects, u.role,
              (SELECT json_agg(sl) FROM social_links sl WHERE sl.user_id=u.id) AS social_links,
              (SELECT json_agg(json_build_object('name',s.name,'slug',s.slug)) FROM user_skills us2 JOIN skills s ON s.id=us2.skill_id WHERE us2.user_id=u.id) AS skills
       FROM users u ${joins.join(' ')} ${whereClause}
       ORDER BY ${sortMap[sort] || sortMap.relevant}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      creators: dataResult.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const searchProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q, category, status = 'open', platforms,
      min_budget, max_budget, sort = 'newest',
      page = 1, limit = DEFAULT_LIMIT,
    } = req.query as Record<string, string>;

    const offset = (Number(page) - 1) * Number(limit);
    const params: unknown[] = [];
    const conditions: string[] = [];

    conditions.push(`p.status='${status}'`);

    if (q) {
      params.push(q);
      conditions.push(`to_tsvector('english', p.title || ' ' || p.description) @@ plainto_tsquery('english', $${params.length})`);
    }

    if (category) {
      params.push(category);
      conditions.push(`c.slug=$${params.length}`);
    }

    if (platforms) {
      const platformList = platforms.split(',');
      params.push(platformList);
      conditions.push(`p.platforms && $${params.length}::text[]`);
    }

    if (min_budget) {
      params.push(Number(min_budget));
      conditions.push(`COALESCE(p.budget_fixed, p.budget_max, p.budget_min, 0) >= $${params.length}`);
    }

    if (max_budget) {
      params.push(Number(max_budget));
      conditions.push(`COALESCE(p.budget_fixed, p.budget_min, 0) <= $${params.length}`);
    }

    const sortMap: Record<string, string> = {
      newest: 'p.created_at DESC',
      budget_asc: 'COALESCE(p.budget_fixed, p.budget_min) ASC NULLS LAST',
      budget_desc: 'COALESCE(p.budget_fixed, p.budget_max) DESC NULLS LAST',
      deadline: 'p.deadline ASC NULLS LAST',
    };

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(
      `SELECT COUNT(*) FROM projects p LEFT JOIN categories c ON c.id=p.category_id ${whereClause}`,
      params
    );
    const total = Number(countResult.rows[0]?.count || 0);

    params.push(Number(limit), offset);
    const dataResult = await query(
      `SELECT p.id, p.title, p.slug, p.description, p.budget_min, p.budget_max,
              p.budget_fixed, p.budget_type, p.deadline, p.status, p.platforms,
              p.tags, p.views, p.applications_count, p.created_at, p.featured,
              json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url) AS client,
              json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category
       FROM projects p
       LEFT JOIN categories c ON c.id=p.category_id
       JOIN users u ON u.id=p.client_id
       ${whereClause}
       ORDER BY p.featured DESC, ${sortMap[sort] || sortMap.newest}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      projects: dataResult.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getSkills = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT id, name, slug, category FROM skills ORDER BY category, name');
    res.json({ skills: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT id, name, slug, icon FROM categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
};
