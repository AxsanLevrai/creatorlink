import { Request, Response, NextFunction } from 'express';
import { query, transaction } from '../db/connection';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';
import { createNotification } from '../utils/notifications';

// ── Get all conversations for user ───────────────────────────
export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;

    const result = await query(
      `SELECT c.id, c.project_id, c.updated_at,
              -- Other participant
              json_build_object(
                'id', u.id, 'username', u.username, 'display_name', u.display_name,
                'avatar_url', u.avatar_url, 'last_seen_at', u.last_seen_at
              ) AS other_user,
              -- Last message
              (SELECT json_build_object('body', m.body, 'created_at', m.created_at, 'sender_id', m.sender_id)
               FROM messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              -- Unread count
              (SELECT COUNT(*) FROM messages m
               WHERE m.conversation_id=c.id
               AND m.sender_id != $1
               AND m.created_at > COALESCE(cp_me.last_read_at, '1970-01-01')) AS unread_count,
              -- Project title if exists
              p.title AS project_title
       FROM conversations c
       JOIN conversation_participants cp_me ON cp_me.conversation_id=c.id AND cp_me.user_id=$1
       JOIN conversation_participants cp_other ON cp_other.conversation_id=c.id AND cp_other.user_id!=$1
       JOIN users u ON u.id=cp_other.user_id
       LEFT JOIN projects p ON p.id=c.project_id
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    res.json({ conversations: result.rows });
  } catch (err) {
    next(err);
  }
};

// ── Get messages in a conversation ───────────────────────────
export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify access
    const access = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2',
      [conversationId, userId]
    );
    if (!access.rows[0]) throw new AppError('Not a participant of this conversation', 403);

    // Mark as read
    await query(
      'UPDATE conversation_participants SET last_read_at=NOW() WHERE conversation_id=$1 AND user_id=$2',
      [conversationId, userId]
    );

    const params: unknown[] = [conversationId, Number(limit)];
    const beforeClause = before ? `AND m.created_at < $${params.push(before)}` : '';

    const result = await query(
      `SELECT m.id, m.body, m.sender_id, m.attachments, m.is_system_msg, m.created_at, m.edited_at,
              json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url) AS sender
       FROM messages m JOIN users u ON u.id=m.sender_id
       WHERE m.conversation_id=$1 ${beforeClause}
       ORDER BY m.created_at DESC LIMIT $2`,
      params
    );

    res.json({ messages: result.rows.reverse() }); // Return chronological
  } catch (err) {
    next(err);
  }
};

// ── Start or get conversation ─────────────────────────────────
export const startConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { recipient_id, project_id } = req.body;

    if (userId === recipient_id) throw new AppError('Cannot message yourself', 400);

    // Check if conversation already exists
    const existing = await query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id=c.id AND cp1.user_id=$1
       JOIN conversation_participants cp2 ON cp2.conversation_id=c.id AND cp2.user_id=$2
       ${project_id ? 'WHERE c.project_id=$3' : 'WHERE c.project_id IS NULL'}`,
      project_id ? [userId, recipient_id, project_id] : [userId, recipient_id]
    );

    if (existing.rows[0]) {
      return res.json({ conversation_id: existing.rows[0].id, existing: true });
    }

    const convId = await transaction(async (client) => {
      const conv = await client.query(
        'INSERT INTO conversations (project_id) VALUES ($1) RETURNING id',
        [project_id || null]
      );
      const id = conv.rows[0].id;
      await client.query('INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)', [id, userId, recipient_id]);
      return id;
    });

    res.status(201).json({ conversation_id: convId, existing: false });
  } catch (err) {
    next(err);
  }
};

// ── Send message (REST fallback + Socket.IO primary path) ─────
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { conversationId } = req.params;
    const { body, attachments } = req.body;

    if (!body?.trim() && (!attachments || attachments.length === 0)) {
      throw new AppError('Message body is required', 400);
    }

    // Verify participant
    const access = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2',
      [conversationId, userId]
    );
    if (!access.rows[0]) throw new AppError('Not a participant', 403);

    const result = await query(
      `INSERT INTO messages (conversation_id, sender_id, body, attachments)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [conversationId, userId, body?.trim(), attachments || []]
    );

    // Update conversation timestamp
    await query('UPDATE conversations SET updated_at=NOW() WHERE id=$1', [conversationId]);

    const message = result.rows[0];

    // Emit via Socket.IO to the conversation room
    io.to(`conv:${conversationId}`).emit('new_message', message);

    // Notify the other participant
    const otherParticipant = await query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id=$1 AND user_id!=$2',
      [conversationId, userId]
    );
    if (otherParticipant.rows[0]) {
      await createNotification({
        userId: otherParticipant.rows[0].user_id,
        type: 'new_message',
        title: 'New message',
        body: body?.slice(0, 100),
        data: { conversation_id: conversationId },
      });
    }

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};
