// src/routes/messages.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getConversations, getMessages, startConversation, sendMessage,
} from '../controllers/messageController';

const router = Router();

router.get('/', authenticate, getConversations);
router.post(
  '/',
  authenticate,
  [body('recipient_id').isUUID()],
  validate,
  startConversation
);
router.get('/:conversationId', authenticate, getMessages);
router.post(
  '/:conversationId',
  authenticate,
  [body('body').optional().trim()],
  validate,
  sendMessage
);

export default router;
