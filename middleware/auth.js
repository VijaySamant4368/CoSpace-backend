import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

export async function protect(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { sub: id, type } = payload;

    let actor = null;
    if (type === 'user') {
      actor = await User.findById(id).select('-passwordHash').lean();
    } else if (type === 'org') {
      actor = await Organization.findById(id).select('-passwordHash').lean();
    }

    if (!actor) {
      return res.status(401).json({ message: 'Account deleted or invalid' });
    }

    req.actor = { id, email: actor.email, type, username: actor.username };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function issueToken(actor) {
  const payload = {
    sub: actor._id,
    email: actor.email,
    type: actor.type,
    username: actor.username,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  return token;
}