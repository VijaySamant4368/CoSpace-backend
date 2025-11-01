import { Router } from 'express';
import { login, signup, verify } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.post('/login', login);
router.post('/signup', signup);
router.get('/verify', protect, verify);
export default router;
