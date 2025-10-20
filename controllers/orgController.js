import asyncHandler from '../middleware/asyncHandler.js';
import Organization from '../models/Organization.js';
import Event from '../models/Event.js';
import Follow from '../models/Follow.js';

export const listOrgs = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = q ? { name: new RegExp(q, 'i') } : {};
  const orgs = await Organization.find(filter).limit(100).lean();
  res.json(orgs);
});

export const getOrgById = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id).lean();
  if (!org) return res.status(404).json({ message: 'Org not found' });
  res.json(org);
});

export const getMeOrg = asyncHandler(async (req, res) => {
  if (req.actor?.type !== 'org') return res.status(401).json({ message: 'Unauthorized' });
  const org = await Organization.findOne({ email: req.actor.email }).lean();
  if (!org) return res.status(404).json({ message: 'Org not found' });
  res.json(org);
});

export const getOrgEvents = asyncHandler(async (req, res) => {
  const { role, from, to, sort='date:asc', page=1, limit=20 } = req.query;
  const orgId = req.params.id;

  const roleFilter = [];
  if (!role || role === 'conducting') roleFilter.push({ conductingOrg: orgId });
  if (!role || role === 'collab')     roleFilter.push({ collaboratingOrg: orgId });

  let q = roleFilter.length ? { $or: roleFilter } : {};
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to)   q.date.$lte = new Date(to);
  }

  const sortMap = { 'date:asc': { date: 1 }, 'date:desc': { date: -1 }, 'name:asc': { name: 1 }, 'name:desc': { name: -1 } };
  const cursor = Event.find(q).sort(sortMap[sort] || { date: 1 });
  const total = await Event.countDocuments(q);
  const items = await cursor.skip((page-1)*limit).limit(Number(limit)).lean();

  res.json({ items, page: Number(page), limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total/limit)) });
});

export const getOrgFollowerCount = asyncHandler(async (req, res) => {
  const orgId = req.params.id;
  const count = await Follow.countDocuments({ targetModel: 'Organization', target: orgId });
  res.json({ count });
});

export const getOrgDashboard = asyncHandler(async (req, res) => {
  const orgId = req.params.id;
  const org = await Organization.findById(orgId).lean();
  if (!org) return res.status(404).json({ message: 'Org not found' });

  const now = new Date();
  const upcoming = await Event.find({
    $or: [{ conductingOrg: orgId }, { collaboratingOrg: orgId }],
    date: { $gte: now }
  }).sort({ date: 1 }).limit(100).lean();

  const followers = await Follow.countDocuments({ targetModel: 'Organization', target: orgId });
  const eventsTotal = await Event.countDocuments({ $or: [{ conductingOrg: orgId }, { collaboratingOrg: orgId }] });

  res.json({
    org,
    followerCount: followers,
    upcomingEvents: upcoming,
    totals: { events: eventsTotal, followers }
  });
});
