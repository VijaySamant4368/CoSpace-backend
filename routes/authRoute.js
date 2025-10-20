import { Router } from 'express';
import { login, verify } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const r = Router();
r.post('/login', login);
r.get('/verify', protect, verify);
export default r;
