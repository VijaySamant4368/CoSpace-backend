import asyncHandler from '../middleware/asyncHandler.js';
import Follow from '../models/Follow.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';

export const listFollowers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const items = await Follow.find({ targetModel: 'Organization', target: id })
    .sort({ createdAt: -1 })
    .populate({ path: 'follower', select: 'username name email' })
    .lean();
  res.json(items);
});

export const listFollowing = asyncHandler(async (req, res) => {
  const { id } = req.params; // user id
  const items = await Follow.find({ followerModel: 'User', follower: id })
    .sort({ createdAt: -1 })
    .populate({ path: 'target', select: 'name email' })
    .lean();
  res.json(items);
});

export const followOrg = asyncHandler(async (req, res) => {
  if (req.actor?.type !== 'user') return res.status(401).json({ message: 'Only users can follow' });
  const { orgId } = req.body;

  const user = await User.findOne({ email: req.actor.email }).lean();
  if (!user) return res.status(401).json({ message: 'User not found' });

  const edge = await Follow.create({
    followerModel: 'User', follower: user._id,
    targetModel: 'Organization', target: orgId,
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
    followerModel: 'User', follower: user._id,
    targetModel: 'Organization', target: orgId
  });

  if (delRes.deletedCount) {
    await Organization.updateOne({ _id: orgId }, { $inc: { followersCount: -1 } });
    await User.updateOne({ _id: user._id }, { $inc: { followingCount: -1 } });
  }
  res.json({ ok: true });
});
