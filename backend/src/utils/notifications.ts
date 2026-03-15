// ============================================================
// src/utils/notifications.ts
// ============================================================
import { query } from '../db/connection';
import { io } from '../index';

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export const createNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    const result = await query(
      'INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [payload.userId, payload.type, payload.title, payload.body, JSON.stringify(payload.data || {})]
    );
    // Push via socket to online user
    io.to(`user:${payload.userId}`).emit('notification', result.rows[0]);
  } catch {
    // Non-critical — swallow notification errors
  }
};
