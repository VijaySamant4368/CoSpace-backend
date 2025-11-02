import { Router } from 'express';
import { deleteAccount, login, signup, updateProfile, verify } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const router = Router();
router.post('/login', login);
router.post('/signup', upload.single('profileImage'), signup);
router.get('/verify', protect, verify);
router.put('/update', protect, upload.single('profileImage'), updateProfile);
router.delete('/delete', protect, deleteAccount);
export default router;
