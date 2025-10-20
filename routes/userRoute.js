import { Router } from 'express';
import User from '../models/User.js';

const r = Router();
r.get('/', async (req, res) => {
  const users = await User.find().select('-passwordHash').limit(100).lean();
  res.json(users);
});
r.get('/:id', async (req, res) => {
  const u = await User.findById(req.params.id).select('-passwordHash').lean();
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json(u);
});
export default r;
