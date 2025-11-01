import jwt from 'jsonwebtoken';

export function protect(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.actor = { email: payload.email, type: payload.type, id: payload.sub, username: payload.username };
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