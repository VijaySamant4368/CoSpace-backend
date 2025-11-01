import asyncHandler from '../middleware/asyncHandler.js';
import Follow from '../models/Follow.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { isValidObjectId } from '../utils/validate.js';

export const listFollowers = asyncHandler(async (req, res) => {
  const { id } = req.params;  // org id
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid Org Id' });
  const items = await Follow.find({organization: id })
    .sort({ createdAt: -1 })
    .populate({ path: 'user', select: 'username name email' })
    .lean();
  res.json(items);
});

export const listFollowing = asyncHandler(async (req, res) => {
  const { id } = req.params; // user id
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid User Id' });
  const items = await Follow.find({ user: id })
    .sort({ createdAt: -1 })
    .populate({ path: 'organization', select: 'name email' })
    .lean();
  res.json(items);
});

export const followOrg = asyncHandler(async (req, res) => {
  if (req.actor?.type !== 'user') return res.status(401).json({ message: 'Only users can follow' });
  const { orgId } = req.body;
  if (!orgId)  return res.status(400).json({ message: 'Org ID missing in the body' });
  if (!isValidObjectId(orgId))  return res.status(400).json({ message: 'Org ID is invalid' });

  const org = await Organization.findOne({ _id: orgId }).lean();
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const user = await User.findOne({ email: req.actor.email }).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  const existing = await Follow.findOne({ user: user._id, organization: orgId });
  if (existing)  return res.status(400).json({ message: 'User already follows' });

  const edge = await Follow.create({
    user: user._id,
    organization: orgId,
  });

  await Organization.updateOne({ _id: orgId }, { $inc: { followersCount: 1 } });
  await User.updateOne({ _id: user._id }, { $inc: { followingCount: 1 } });

  res.status(201).json(edge);
});

export const unfollowOrg = asyncHandler(async (req, res) => {
  if (req.actor?.type !== 'user') return res.status(401).json({ message: 'Only users can unfollow' });
  const { orgId } = req.body;

  const user = await User.findOne({ email: req.actor.email }).lean();
  if (!user) return res.status(401).json({ message: 'User not found' });

  const delRes = await Follow.deleteOne({
    user: user._id,
    organization: orgId
  });

  if (delRes.deletedCount) {
    await Organization.updateOne({ _id: orgId }, { $inc: { followersCount: -1 } });
    await User.updateOne({ _id: user._id }, { $inc: { followingCount: -1 } });
  }
  res.json({ ok: true, message: "Unfollowed" });
});


// GET /api/follow/doIFollow/:orgId
export const doIFollow = asyncHandler(async (req, res) => {
  const { actor } = req;           // from protect middleware
  const { orgId } = req.params;

  if (actor?.type !== 'user')
    return res.status(403).json({ message: 'Only users can follow organizations' });

  if (!isValidObjectId(orgId))
    return res.status(400).json({ message: 'Invalid organization ID' });

  const exists = await Follow.exists({ user: actor.id, organization: orgId });
  res.json({ following: !!exists });
});

// GET /api/follow/doesFollowMe/:userId
export const doesFollowMe = asyncHandler(async (req, res) => {
  const { actor } = req;        // from protect middleware
  const { userId } = req.params;

  if (actor?.type !== 'org')
    return res.status(403).json({ message: 'Only organizations can check followers' });

  if (!isValidObjectId(userId))
    return res.status(400).json({ message: 'Invalid user ID' });

  const exists = await Follow.exists({ user: userId, org: actor.id });
  res.json({ followsMe: !!exists });
});