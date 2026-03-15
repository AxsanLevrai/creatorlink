import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { query, transaction } from '../db/connection';
import { sendEmail } from '../utils/email';
import { createNotification } from '../utils/notifications';
import { AppError } from '../middleware/errorHandler';
import slugify from 'slugify';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

function signTokens(userId: string, role: string) {
  const access = jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refresh = jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
  return { access, refresh };
}

// ── Register ─────────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, username, display_name, role } = req.body;

    // Check existing user
    const existing = await query('SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]);
    if (existing.rows.length > 0) {
      throw new AppError('Email or username already in use', 409);
    }

    const password_hash = await bcrypt.hash(password, 12);
    const verify_token = crypto.randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO users (email, password_hash, username, display_name, role, email_verify_token, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending_verification')
       RETURNING id, email, username, display_name, role, status, created_at`,
      [email, password_hash, username.toLowerCase(), display_name, role, verify_token]
    );
    const user = result.rows[0];

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Verify your CreatorLink account',
      template: 'verify-email',
      data: {
        name: display_name,
        link: `${process.env.FRONTEND_URL}/auth/verify-email?token=${verify_token}`,
      },
    });

    const { access, refresh } = signTokens(user.id, user.role);

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      user: { id: user.id, email: user.email, username: user.username, display_name: user.display_name, role: user.role, status: user.status },
      tokens: { access, refresh },
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, email, username, display_name, role, status, password_hash, avatar_url FROM users WHERE email=$1',
      [email]
    );
    const user = result.rows[0];

    if (!user || !user.password_hash) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    if (user.status === 'suspended') throw new AppError('Account suspended. Contact support.', 403);
    if (user.status === 'deleted') throw new AppError('Account not found', 404);

    // Update last_seen
    await query('UPDATE users SET last_seen_at=NOW() WHERE id=$1', [user.id]);

    const { access, refresh } = signTokens(user.id, user.role);

    res.json({
      user: { id: user.id, email: user.email, username: user.username, display_name: user.display_name, role: user.role, status: user.status, avatar_url: user.avatar_url },
      tokens: { access, refresh },
    });
  } catch (err) {
    next(err);
  }
};

// ── Google OAuth callback ─────────────────────────────────────
export const googleCallback = async (req: Request, res: Response) => {
  const user = req.user as any;
  const { access, refresh } = signTokens(user.id, user.role);
  // Redirect to frontend with tokens in query (frontend stores them)
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?access=${access}&refresh=${refresh}`);
};

// ── Get Me ────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.username, u.display_name, u.role, u.status,
              u.avatar_url, u.banner_url, u.bio, u.location, u.languages,
              u.hourly_rate, u.availability_status, u.profile_views,
              u.avg_rating, u.total_reviews, u.completed_projects,
              u.show_email, u.notification_prefs, u.created_at
       FROM users u WHERE u.id=$1`,
      [req.user!.sub]
    );
    if (!result.rows[0]) throw new AppError('User not found', 404);
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── Token refresh ─────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh } = req.body;
    if (!refresh) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(refresh, JWT_REFRESH_SECRET) as { sub: string };
    const result = await query('SELECT id, role, status FROM users WHERE id=$1', [decoded.sub]);
    const user = result.rows[0];

    if (!user || user.status === 'deleted' || user.status === 'suspended') {
      throw new AppError('Invalid token', 401);
    }

    const tokens = signTokens(user.id, user.role);
    res.json({ tokens });
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid refresh token', 401));
    }
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────
export const logout = async (_req: Request, res: Response) => {
  // Stateless JWT — client just discards tokens
  // For production, maintain a token blocklist in Redis
  res.json({ message: 'Logged out successfully' });
};

// ── Email verification ────────────────────────────────────────
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const result = await query(
      `UPDATE users SET email_verified=true, email_verify_token=NULL, status='active'
       WHERE email_verify_token=$1 AND status='pending_verification'
       RETURNING id`,
      [token]
    );
    if (!result.rows[0]) throw new AppError('Invalid or expired verification token', 400);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Request password reset ────────────────────────────────────
export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const result = await query('SELECT id, display_name FROM users WHERE email=$1 AND status!=\'deleted\'', [email]);
    const user = result.rows[0];

    // Always respond 200 to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link was sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
      [user.id, token, expires]
    );

    await sendEmail({
      to: email,
      subject: 'Reset your CreatorLink password',
      template: 'reset-password',
      data: {
        name: user.display_name,
        link: `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`,
        expires_in: '1 hour',
      },
    });

    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    next(err);
  }
};

// ── Reset password ────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    const tokenResult = await query(
      'SELECT user_id FROM password_reset_tokens WHERE token=$1 AND expires_at>NOW() AND used=false',
      [token]
    );
    if (!tokenResult.rows[0]) throw new AppError('Invalid or expired reset token', 400);

    const { user_id } = tokenResult.rows[0];
    const password_hash = await bcrypt.hash(password, 12);

    await transaction(async (client) => {
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [password_hash, user_id]);
      await client.query('UPDATE password_reset_tokens SET used=true WHERE token=$1', [token]);
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Change password (authenticated) ──────────────────────────
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user!.sub;

    const result = await query('SELECT password_hash FROM users WHERE id=$1', [userId]);
    const user = result.rows[0];

    if (!user?.password_hash) throw new AppError('No password set (OAuth account)', 400);

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) throw new AppError('Current password is incorrect', 401);

    const new_hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [new_hash, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Change email ──────────────────────────────────────────────
export const changeEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { new_email, password } = req.body;
    const userId = req.user!.sub;

    const result = await query('SELECT password_hash, email FROM users WHERE id=$1', [userId]);
    const user = result.rows[0];

    if (!user?.password_hash) throw new AppError('No password set (OAuth account)', 400);
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError('Password is incorrect', 401);

    const exists = await query('SELECT id FROM users WHERE email=$1', [new_email]);
    if (exists.rows[0]) throw new AppError('Email already in use', 409);

    const verify_token = crypto.randomBytes(32).toString('hex');
    await query(
      'UPDATE users SET email=$1, email_verified=false, email_verify_token=$2, status=\'pending_verification\' WHERE id=$3',
      [new_email, verify_token, userId]
    );

    await sendEmail({
      to: new_email,
      subject: 'Verify your new email on CreatorLink',
      template: 'verify-email',
      data: {
        name: user.display_name,
        link: `${process.env.FRONTEND_URL}/auth/verify-email?token=${verify_token}`,
      },
    });

    res.json({ message: 'Email updated. Please verify your new email address.' });
  } catch (err) {
    next(err);
  }
};
