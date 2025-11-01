import asyncHandler from '../middleware/asyncHandler.js';
import Attendance from '../models/Attendance.js';
import Event from '../models/Event.js';
import { isValidObjectId } from '../utils/validate.js';

// POST /api/attendance/attend  { eventId }
export const attend = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.body || {};

  if (actor?.type !== 'user') return res.status(403).json({ message: 'Only users can attend events' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid eventId' });

  // fetch as a real document (no .lean), and include totalAttending
  const event = await Event.findById(eventId).select('date totalAttending');
  if (!event) return res.status(404).json({ message: 'Event not found' });

  if (event.date.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Cannot attend; event date has already passed' });
  }

  const existing = await Attendance.findOne({ user: actor.id, event: eventId }).lean();
  if (existing) {
    return res.status(400).json({ message: 'User is already marked as attending this event.' });
  }

  const doc = await Attendance.create({ user: actor.id, event: eventId });

  event.totalAttending = (event.totalAttending || 0) + 1;
  await event.save();

  return res.status(201).json({ attending: true, attendance: doc });
});

// POST /api/attendance/unattend  { eventId }
export const unattend = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.body || {};

  if (actor?.type !== 'user') return res.status(403).json({ message: 'Only users can unattend events' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid eventId' });

  const event = await Event.findById(eventId).select('date totalAttending');
  if (!event) return res.status(404).json({ message: 'Event not found' });

  if (event.date.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Cannot change attendance; event date has already passed' });
  }

  const del = await Attendance.deleteOne({ user: actor.id, event: eventId });

  if (del.deletedCount === 1) {
    event.totalAttending = Math.max(0, (event.totalAttending || 0) - 1);
    await event.save();
  }

  return res.json({ attending: false, removed: del.deletedCount === 1 });
});

export const getAttendeeDetails = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  if (!isValidObjectId(eventId)) {
    return res.status(400).json({ message: 'Invalid eventId' });
  }

  // Populate user info from Attendance
  const attendees = await Attendance.find({ event: eventId })
    .populate('user', 'name username email profilePicture')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    count: attendees.length,
    attendees: attendees.map(a => ({
      id: a.user?._id,
      name: a.user?.name,
      username: a.user?.username,
      email: a.user?.email,
      profilePicture: a.user?.profilePicture,
      joinedAt: a.createdAt
    }))
  });
});


export const getAttendingDetails = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid userId' });
  }

  // Populate event info from Attendance
  const attendings = await Attendance.find({ user: userId })
    .populate('event', 'name description date venue totalAttending conductingOrgId collaboratingOrgId')
    .sort({ createdAt: -1 })
    .lean();

  const events = attendings
    .map(a => a.event)
    .filter(Boolean)
    .map(e => ({
      id: e._id,
      name: e.name,
      description: e.description,
      date: e.date,
      venue: e.venue,
      totalAttending: e.totalAttending,
      conductingOrgId: e.conductingOrgId,
      collaboratingOrgId: e.collaboratingOrgId
    }));

  res.json({
    userId,
    count: events.length,
    events
  });
});


// GET /api/attendance/isMeAttending/:eventId
export const isMeAttending = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.params;

  if (actor?.type !== 'user') return res.status(403).json({ message: 'Only users can query this' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid eventId' });

  const exists = await Attendance.exists({ user: actor.id, event: eventId });
  res.json({ attending: !!exists });
});
