import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import bcrypt from 'bcrypt';
import { issueToken } from '../middleware/auth.js';

// number of salt rounds (10–12 is a good default)
const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hashed;
}

export async function verifyPassword(plainPassword, storedHash) {
  const isMatch = await bcrypt.compare(plainPassword, storedHash);
  return isMatch;
}

export const login = asyncHandler(async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email & password required' });

  email = String(email).toLowerCase();

  // Try User, then Org
  const user = await User.findOne({ email }).lean();
  const org  = user ? null : await Organization.findOne({ email }).lean();
  const actor = user ? { ...user, type: 'user' } : org ? { ...org, type: 'org' } : null;
  console.log(actor)
  if (!actor?.passwordHash) return res.status(404).json({ message: 'Account not found' });

  const ok = await verifyPassword(password, actor.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = issueToken(actor);
  res.json({ token, user: { name: actor.name, email: actor.email, type: actor.type, username: actor.username } });
});

export const signup = asyncHandler(async (req, res) => {
  let { type, name, email, password, username, headName } = req.body || {};
  if (!type || !['user','org'].includes(type)) return res.status(400).json({ message: 'type must be "user" or "org"' });
  if (!name || !email || !password || !username) return res.status(400).json({ message: 'name, email, password, username are required' });

  email = String(email).toLowerCase();

  // Ensure uniqueness across both collections
  const existsUser = await User.exists({ email });
  if (existsUser) return res.status(409).json({ message: 'Email already in use by some user' });
  const existsOrg  = await Organization.exists({ email });
  if (existsOrg) return res.status(409).json({ message: 'Email already in use by some other organization' });

  const passwordHash = await hashPassword(password);

  if (type === 'user') {
    const doc = await User.create({ name, email, username, passwordHash });
    const token = issueToken({ _id: doc._id, email: doc.email, type, username:doc.username });
    return res.status(201).json({ token, id: doc._id, type, name: doc.name, email: doc.email, username:doc.username});
  } else {
    const doc = await Organization.create({ name, email, headName, passwordHash, username });
    const token = issueToken({ _id: doc._id, email: doc.email, type, username:doc.username });
    return res.status(201).json({ token, id: doc._id, type, name: doc.name, email: doc.email, username:doc.username});
  }
});


//To know if the actor is user or org
export const verify = asyncHandler(async (req, res) => {
  //`protect()` already validated
  const { actor } = req;
  if (!actor) return res.json({ user: null });
  if (actor.type == 'user') res.json({ user: actor });
  if (actor.type == 'org') res.json({ org: actor });
});
