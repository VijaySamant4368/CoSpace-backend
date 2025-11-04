import asyncHandler from '../middleware/asyncHandler.js';
import Organization from '../models/Organization.js';
import Event from '../models/Event.js';

// Escape user input for regex fallback
const escapeRegex = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pick = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));

export const unifiedSearch = asyncHandler(async (req, res) => {
  const {
    q = '',
    type = 'all',          // 'org' | 'event' | 'all'
    limit = 8,             // per facet
    from,                  // YYYY-MM-DD (events)
    to,                    // YYYY-MM-DD (events)
    skills,                // comma or array
    orgType,               // Organization orgType filter
  } = req.query;

  const perFacet = Math.min(25, Math.max(1, Number(limit) || 8));
  const hasQuery = Boolean(String(q).trim());
  const rx = hasQuery ? new RegExp(escapeRegex(String(q).trim()), 'i') : null;

  // ---- Organization query builder ----
  const orgFilters = {};
  if (orgType) orgFilters.orgType = orgType;

  // Prefer $text if query provided and you have text index, else regex fallback on name/mission
  const orgQuery = hasQuery
    ? { $or: [{ $text: { $search: q } }, { name: rx }, { mission: rx }, { affiliation: rx }] }
    : {};

  const orgProjection = {
    name: 1,
    username: 1,
    orgType: 1,
    profilePicture: 1,
    followersCount: 1,
    // include textScore if using $text to sort
    score: { $meta: 'textScore' },
  };

  // ---- Event query builder ----
  const evtFilters = {};
  if (from || to) {
    evtFilters.date = {};
    if (from) evtFilters.date.$gte = new Date(from);
    if (to)   evtFilters.date.$lte = new Date(to);
  }

  let skillsArray = [];
  if (skills) {
    skillsArray = Array.isArray(skills)
      ? skills
      : String(skills).split(',').map(s => s.trim()).filter(Boolean);
    if (skillsArray.length) {
      // match any skill in provided list
      evtFilters.skills = { $in: skillsArray };
    }
  }

  const evtQuery = hasQuery
    ? { $or: [{ $text: { $search: q } }, { name: rx }, { description: rx }, { skills: rx }] }
    : {};

  const evtProjection = {
    name: 1,
    description: 1,
    date: 1,
    time: 1,
    venue: 1,
    image: 1,
    conductingOrgId: 1,
    collaboratingOrgId: 1,
    totalAttending: 1,
    score: { $meta: 'textScore' },
  };

  // choose sort: text score first, otherwise reasonable defaults
  const orgSort = hasQuery ? { score: { $meta: 'textScore' } } : { followersCount: -1, name: 1 };
  const evtSort = hasQuery ? { score: { $meta: 'textScore' } } : { date: 1, name: 1 };

  const doOrg = type === 'org' || type === 'all';
  const doEvt = type === 'event' || type === 'all';

  const [orgs, events] = await Promise.all([
    doOrg
      ? Organization.find({ ...orgFilters, ...orgQuery })
          .select(orgProjection)
          .sort(orgSort)
          .limit(perFacet)
          .lean()
      : Promise.resolve([]),
    doEvt
      ? Event.find({ ...evtFilters, ...evtQuery })
          .select(evtProjection)
          .sort(evtSort)
          .limit(perFacet)
          .lean()
      : Promise.resolve([]),
  ]);

  // Normalize a small “kind” field for the client
  const orgsOut = orgs.map(o => ({
    kind: 'org',
    id: String(o._id),
    name: o.name,
    username: o.username,
    orgType: o.orgType,
    profilePicture: o.profilePicture || null,
    followersCount: o.followersCount ?? 0,
  }));

  const eventsOut = events.map(e => ({
    kind: 'event',
    id: String(e._id),
    name: e.name,
    date: e.date,
    time: e.time,
    venue: e.venue,
    image: e.image || null,
    conductingOrgId: e.conductingOrgId,
    collaboratingOrgId: e.collaboratingOrgId || null,
    totalAttending: e.totalAttending ?? 0,
  }));

  res.json({
    query: q,
    type,
    limit: perFacet,
    filters: {
      ...(orgType ? { orgType } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(skillsArray.length ? { skills: skillsArray } : {}),
    },
    results: {
      orgs: orgsOut,
      events: eventsOut,
    },
  });
});

// Lightweight autocomplete/suggestions
export const suggest = asyncHandler(async (req, res) => {
  const { q = '', limit = 5 } = req.query;
  const per = Math.min(10, Math.max(1, Number(limit) || 5));
  const hasQuery = Boolean(String(q).trim());
  if (!hasQuery) return res.json({ query: '', suggestions: [] });

  const rx = new RegExp('^' + escapeRegex(String(q).trim()), 'i');

  const [orgs, events] = await Promise.all([
    Organization.find({ $or: [{ name: rx }, { username: rx }] })
      .select({ name: 1, username: 1 })
      .limit(per)
      .lean(),
    Event.find({ name: rx })
      .select({ name: 1 })
      .limit(per)
      .lean(),
  ]);

  const suggestions = [
    ...orgs.map(o => ({ kind: 'org', id: String(o._id), label: o.name, sub: o.username })),
    ...events.map(e => ({ kind: 'event', id: String(e._id), label: e.name })),
  ].slice(0, per); // cap total

  res.json({ query: q, suggestions });
});
