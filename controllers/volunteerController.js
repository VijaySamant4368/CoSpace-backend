import asyncHandler from '../middleware/asyncHandler.js';
import { isValidObjectId } from '../utils/validate.js';
import Event from '../models/Event.js';
import Volunteer from '../models/Volunteer.js';
import { isDateTimeInPast } from '../utils/time.js';

// POST /api/volunteer/volunteer/:eventId
export const volunteer = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.params;
  if (actor?.type !== 'user') return res.status(403).json({ message: 'Only users can volunteer' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid eventId' });

  const event = await Event.findById(eventId).select('date conductingOrgId collaboratingOrgId time').lean();
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (isDateTimeInPast(event.date, event.time)) return res.status(400).json({ message: 'Event already passed' });

  // create or re-open (if previously rejected)
  const doc = await Volunteer.findOneAndUpdate(
    { user: actor.id, event: eventId },
    { $set: { status: 'pending' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ ok: true, volunteer: doc });
});

// POST /api/volunteer/unvolunteer/:eventId
export const unvolunteer = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.params;
  if (actor?.type !== 'user') return res.status(403).json({ message: 'Only users can unvolunteer' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid eventId' });

  const event = await Event.findById(eventId).select('date time').lean();
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (isDateTimeInPast(event.date, event.time)) return res.status(400).json({ message: 'Event already passed' });

  const del = await Volunteer.deleteOne({ user: actor.id, event: eventId });
  res.json({ ok: true, removed: del.deletedCount === 1 });
});

// GET /api/volunteer/volunteers/:eventId?status=pending|approved|rejected
// Only an org that conducts or collaborates can view
export const listVolunteers = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.params;
  const { status } = req.query;

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Only orgs can view volunteers' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid eventId' });

  const event = await Event.findById(eventId).select('conductingOrgId collaboratingOrgId time date').lean();
  if (!event) return res.status(404).json({ message: 'Event not found' });

  const isOwner =
    String(event.conductingOrgId) === actor.id ||
    (event.collaboratingOrgId && String(event.collaboratingOrgId) === actor.id);
  if (!isOwner) return res.status(403).json({ message: 'Not authorized' });

  const filter = { event: eventId };
  if (status && ['pending','approved','rejected'].includes(status)) filter.status = status;

  const items = await Volunteer.find(filter)
    .populate('user', 'name username email profilePicture')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    eventId,
    count: items.length,
    volunteers: items.map(v => ({
      userId: v.user?._id,
      name: v.user?.name,
      username: v.user?.username,
      email: v.user?.email,
      profilePicture: v.user?.profilePicture,
      status: v.status,
      appliedAt: v.createdAt,
    })),
  });
});

// GET /api/volunteer/volunteered/:userId
export const listUserVolunteered = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) return res.status(400).json({ message: 'Invalid userId' });

  const items = await Volunteer.find({ user: userId })
    .populate('event', 'name date time venue isVirtual image conductingOrgId collaboratingOrgId')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    userId,
    count: items.length,
    records: items.map(r => ({
      eventId: r.event?._id,
      eventName: r.event?.name,
      date: r.event?.date,
      time: r.event?.time,
      venue: r.event?.venue,
      isVirtual: r.event?.isVirtual,
      image: r.event?.image,
      status: r.status,
      appliedAt: r.createdAt,
    })),
  });
});

// POST /api/volunteer/approve/:eventId/:userId
export const approveVolunteer = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId, userId } = req.params;

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Only orgs can approve' });
  if (!isValidObjectId(eventId) || !isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid ids' });
  }

  const event = await Event.findById(eventId).select('conductingOrgId collaboratingOrgId date time').lean();
  if (!event) return res.status(404).json({ message: 'Event not found' });

  const isOwner =
    String(event.conductingOrgId) === actor.id ||
    (event.collaboratingOrgId && String(event.collaboratingOrgId) === actor.id);
  if (!isOwner) return res.status(403).json({ message: 'Not authorized' });
  if (isDateTimeInPast(event.date, event.time)) return res.status(400).json({ message: 'Event already passed' });

  const v = await Volunteer.findOneAndUpdate(
    { event: eventId, user: userId },
    { $set: { status: 'approved' } },
    { new: true }
  );
  if (!v) return res.status(404).json({ message: 'Volunteer record not found' });
  res.json({ ok: true, volunteer: v });
});

// POST /api/volunteer/reject/:eventId/:userId
export const rejectVolunteer = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId, userId } = req.params;

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Only orgs can reject' });
  if (!isValidObjectId(eventId) || !isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid ids' });
  }

  const event = await Event.findById(eventId).select('conductingOrgId collaboratingOrgId date time').lean();
  if (!event) return res.status(404).json({ message: 'Event not found' });

  const isOwner =
    String(event.conductingOrgId) === actor.id ||
    (event.collaboratingOrgId && String(event.collaboratingOrgId) === actor.id);
  if (!isOwner) return res.status(403).json({ message: 'Not authorized' });
  if (isDateTimeInPast(event.date, event.time)) return res.status(400).json({ message: 'Event already passed' });

  const v = await Volunteer.findOneAndUpdate(
    { event: eventId, user: userId },
    { $set: { status: 'rejected' } },
    { new: true }
  );
  if (!v) return res.status(404).json({ message: 'Volunteer record not found' });
  res.json({ ok: true, volunteer: v });
});

export const isMeVolunteering = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.params;

  if (actor?.type !== 'user') return res.status(403).json({ message: 'Only users can query this' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid eventId' });

  const exists = await Volunteer.exists({ user: actor.id, event: eventId });
  res.json({ volunteering: !!exists });
});