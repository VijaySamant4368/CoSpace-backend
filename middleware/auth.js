export function protect(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ message: 'No token' });

  // demo decode: token is base64 of { name,email,type,iat,exp,sub }
  try {
    const payload = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
    if (Date.now() > payload.exp) return res.status(401).json({ message: 'Token expired' });
    // map to your actor
    req.actor = { email: payload.email, type: payload.type }; // 'user' | 'org'
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
