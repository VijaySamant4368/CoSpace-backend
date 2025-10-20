import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

function issueToken(payload) {
  const iat = Date.now();
  const exp = iat + 7*24*60*60*1000;
  const json = JSON.stringify({ ...payload, iat, exp, sub: payload.email });
  return Buffer.from(json, 'utf8').toString('base64'); // demo only
}

// tiny demo hash parity with your seed: "demo" -> hashed_pw_1, others -> hashed_pw_2
const demoHash = (s='') => (s === 'demo' ? 'hashed_pw_1' : 'hashed_pw_2');

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email & password required' });

  const user = await User.findOne({ email }).lean();
  const org  = user ? null : await Organization.findOne({ email }).lean();
  const actor = user ? { ...user, type: 'user' } : org ? { ...org, type: 'org' } : null;
  if (!actor) return res.status(404).json({ message: 'Account not found' });

  // parity with seed – compare to stored passwordHash field
  const ok = actor.passwordHash === demoHash(password);
  if (!ok) return res.status(401).json({ message: "Invalid password (tip: use 'demo')" });

  const token = issueToken({ name: actor.name, email: actor.email, type: actor.type });
  res.json({ token, user: { name: actor.name, email: actor.email, type: actor.type } });
});

export const verify = asyncHandler(async (req, res) => {
  // protect() already validated; just echo actor
  const { actor } = req;
  if (!actor) return res.json({ user: null });
  res.json({ user: actor });
});
