export function adminOnly(req, res, next) {
  const { actor } = req;
  if (!actor || actor.type !== 'admin') {
    return res.status(403).json({ message: 'Admins only' });
  }
  next();
}
