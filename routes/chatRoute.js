import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listMyConversations, getConversation, listMessages, addMessage, createOrGetChat } from '../controllers/chatController.js';

const router = Router();

router.get('/', protect, listMyConversations);
router.post('/', protect, createOrGetChat); // POST /api/chats
router.get('/:convoId', protect, getConversation);
router.get('/:convoId/messages', protect, listMessages);
router.post('/:convoId/messages', protect, addMessage);

export default router;
