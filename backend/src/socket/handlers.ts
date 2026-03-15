import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection';
import { logger } from '../utils/logger';

interface AuthSocket extends Socket {
  userId?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Auth middleware for socket connections
  io.use(async (socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      socket.userId = payload.sub;
      // Update last_seen
      query('UPDATE users SET last_seen_at=NOW() WHERE id=$1', [payload.sub]).catch(() => {});
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    const userId = socket.userId!;
    logger.info(`Socket connected: ${userId}`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // ── Join conversation room ─────────────────────────────
    socket.on('join_conversation', async (conversationId: string) => {
      // Verify user is a participant
      const access = await query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2',
        [conversationId, userId]
      );
      if (access.rows[0]) {
        socket.join(`conv:${conversationId}`);
        logger.info(`User ${userId} joined conversation ${conversationId}`);
      }
    });

    // ── Leave conversation room ────────────────────────────
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── Send message via socket ────────────────────────────
    socket.on('send_message', async (data: {
      conversation_id: string;
      body: string;
      attachments?: string[];
    }) => {
      try {
        const { conversation_id, body, attachments } = data;

        const access = await query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2',
          [conversation_id, userId]
        );
        if (!access.rows[0]) return;

        const result = await query(
          'INSERT INTO messages (conversation_id, sender_id, body, attachments) VALUES ($1,$2,$3,$4) RETURNING *',
          [conversation_id, userId, body.trim(), attachments || []]
        );

        await query('UPDATE conversations SET updated_at=NOW() WHERE id=$1', [conversation_id]);

        const message = result.rows[0];

        // Broadcast to room
        io.to(`conv:${conversation_id}`).emit('new_message', message);

        // Notify offline participant
        const other = await query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id=$1 AND user_id!=$2',
          [conversation_id, userId]
        );
        if (other.rows[0]) {
          io.to(`user:${other.rows[0].user_id}`).emit('notification', {
            type: 'new_message',
            conversation_id,
            preview: body.slice(0, 80),
          });
        }
      } catch (err) {
        logger.error('Socket send_message error', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicators ──────────────────────────────────
    socket.on('typing_start', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('user_typing', { user_id: userId, conversation_id: conversationId });
    });

    socket.on('typing_stop', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('user_stopped_typing', { user_id: userId, conversation_id: conversationId });
    });

    // ── Mark messages as read ──────────────────────────────
    socket.on('mark_read', async (conversationId: string) => {
      await query(
        'UPDATE conversation_participants SET last_read_at=NOW() WHERE conversation_id=$1 AND user_id=$2',
        [conversationId, userId]
      ).catch(() => {});
      socket.to(`conv:${conversationId}`).emit('messages_read', { conversation_id: conversationId, user_id: userId });
    });

    // ── Disconnect ─────────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userId}`);
    });
  });
};
