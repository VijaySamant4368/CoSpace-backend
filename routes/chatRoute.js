import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listMyConversations, getConversation, listMessages, addMessage } from '../controllers/chatController.js';

const r = Router();
r.get('/', protect, listMyConversations);
r.get('/:convoId', protect, getConversation);
r.get('/:convoId/messages', protect, listMessages);
r.post('/:convoId/messages', protect, addMessage);
export default r;
