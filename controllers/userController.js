import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Follow from '../models/Follow.js'; 

// GET /api/users
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-passwordHash') // hide password
    .limit(100)
    .lean();

  res.json(users);
});

// GET /api/users/:id
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-passwordHash')
    .lean();

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
});

// GET /api/user/feed (protected)
export const getFeedEvents = asyncHandler(async (req, res) => {
  const { actor } = req;
  if (!actor || actor.type !== 'user') {
    return res.status(403).json({ message: 'Only users have a feed' });
  }

  // all org ids this user follows
  const edges = await Follow.find({ followerModel: 'User', follower: actor.id })
                            .select('followee')
                            .lean();
  const orgIds = edges.map(e => e.followee).filter(Boolean);
  if (orgIds.length === 0) return res.json([]);

  // fetch events from followed orgs (optionally only upcoming)
  const events = await Event.find({
    $or: [{ conductingOrgId: { $in: orgIds } }, { collaboratingOrgId: { $in: orgIds } }],
    // date: { $gte: new Date() }, // uncomment if you only want upcoming
  })
    .sort({ date: 1 })
    .lean();

  res.json(events);
});

// GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
  const { actor } = req;
  if (!actor || actor.type !== 'user') {
    return res.status(403).json({ message: 'Only users can access their profile' });
  }

  const user = await User.findById(actor.id)
    .lean();

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
});

export const updateMe = asyncHandler(async (req, res) => {
  const { actor } = req;
  if (!actor || actor.type !== 'user') {
    return res.status(403).json({ message: 'Only users are allowed' });
  }

  const allowed = ['name', 'username', 'bio', 'interests', 'profilePicture', 'dob'];
  const updates = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

//   if (updates.interests && !Array.isArray(updates.interests)) {
//     return res.status(400).json({ message: 'interests must be an array of strings' });
//   }
  if (updates.dob) {
    if (!isValidDate(updates.dob)) {
      return res.status(400).json({ message: 'Invalid dob format (use ISO date string)' });
    }
    updates.dob = new Date(updates.dob);
  }

  const user = await User.findByIdAndUpdate(actor.id, updates, {
    new: true,
    runValidators: true,
    context: 'query',
  })
    .select('-passwordHash')
    .lean();

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({ message: 'Profile updated', user });
});

// DELETE /api/users/me
export const deleteMe = asyncHandler(async (req, res) => {
  const { actor } = req;
  if (!actor || actor.type !== 'user') {
    return res.status(403).json({ message: 'Only users are allowedz' });
  }

  const userId = actor.id;

  await Promise.all([
    Attendance.deleteMany({ user: userId }),
    Follow.deleteMany({ followerModel: 'User', follower: userId }),
  ]);

  const del = await User.findByIdAndDelete(userId);
  if (!del) return res.status(404).json({ message: 'User not found' });

  res.json({ deleted: true });
});