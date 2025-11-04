import asyncHandler from '../middleware/asyncHandler.js';
import Organization from '../models/Organization.js';
import Event from '../models/Event.js';
import Follow from '../models/Follow.js';
import { connect } from 'mongoose';

export const listOrgs = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = q ? { name: new RegExp(q, 'i') } : {};
  const orgs = await Organization.find(filter).select('-passwordHash').limit(100).lean();
  res.json(orgs);
});

export const getOrgById = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id).select('-passwordHash').lean();
  if (!org) return res.status(404).json({ message: 'Org not found' });
  res.json(org);
});

export const getMeOrg = asyncHandler(async (req, res) => {
  if (req.actor?.type !== 'org') return res.status(403).json({ message: 'Not allowed' });
  const org = await Organization.findById(req.actor.id).select('-passwordHash').lean();
  if (!org) return res.status(404).json({ message: 'Org not found' });
  res.json(org);
});


export const getOrgEvents = asyncHandler(async (req, res) => {
  const orgId = req.params.id;

  const q = {
    $or: [
      { conductingOrgId: orgId },
      { collaboratingOrgId: orgId }
    ]
  };

  const events = await Event.find(q).lean();
  console.log(events)
  res.json(events);
});

export const getOrgFollowerCount = asyncHandler(async (req, res) => {
  const orgId = req.params.id;
  const count = await Follow.countDocuments({ "organization": orgId });
  res.json({ count });
});
// GET /api/orgs/me/dashboard
export const getMyDashboard = asyncHandler(async (req, res) => {
  if (req.actor?.type !== 'org')
    return res.status(403).json({ message: 'Forbidden' });

  const orgId = req.actor.id;
  const org = await Organization.findById(orgId)
    .select('-passwordHash')
    .lean();
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const now = new Date();

  //pagination via query, e.g. ?upLimit=20&pastLimit=20
  const upLimit = Math.min(200, Math.max(1, Number(req.query.upLimit) || 100));
  const pastLimit = Math.min(200, Math.max(1, Number(req.query.pastLimit) || 100));

  const baseMatch = {
    $or: [{ conductingOrgId: orgId }, { collaboratingOrgId: orgId }],
  };

  const [
    upcomingEvents,
    pastEvents,
    followerCount,
    totalUpcoming,
    totalPast,
  ] = await Promise.all([
    // Upcoming: date >= now (soonest first)
    Event.find({ ...baseMatch, date: { $gte: now } })
      .sort({ date: 1 })
      .limit(upLimit)
      .select('name description date venue totalAttending conductingOrgId collaboratingOrgId')
      .lean(),

    // Past: date < now (most recent first)
    Event.find({ ...baseMatch, date: { $lt: now } })
      .sort({ date: -1 })
      .limit(pastLimit)
      .select('name description date venue totalAttending conductingOrgId collaboratingOrgId')
      .lean(),

    Follow.countDocuments({ organization: orgId }),

    Event.countDocuments({ ...baseMatch, date: { $gte: now } }),
    Event.countDocuments({ ...baseMatch, date: { $lt: now } }),
  ]);

  res.json({
    org,
    followerCount,
    upcomingEvents,
    pastEvents,
    totals: {
      upcoming: totalUpcoming,
      past: totalPast,
      events: totalUpcoming + totalPast,
      followers: followerCount,
    },
  });
});
