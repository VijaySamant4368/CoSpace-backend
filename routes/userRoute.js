import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listUsers, getUserById, getMe, deleteMe, updateMe, getFeedEvents } from '../controllers/userController.js';

const router = Router();

router.get('/', listUsers);
router.get('/feed', protect, getFeedEvents);

router.get('/me/profile', protect, getMe);
router.put('/me/profile', protect, updateMe);
router.delete('/me', protect, deleteMe);

router.get('/:id', getUserById);
export default router;
