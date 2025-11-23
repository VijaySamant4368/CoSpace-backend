import asyncHandler from '../middleware/asyncHandler.js';
import Event from '../models/Event.js';
import Collabration from '../models/Collaboration.js';
import { isValidObjectId } from '../utils/validate.js';
import mongoose from 'mongoose';
import { isDateTimeInPast } from '../utils/time.js';
import { notify } from '../utils/notify.js';

// POST /api/events/:eventId/collab/requests
// Body: { note?: string }
export const createCollabRequest = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.params;
  const { note = '' } = req.body || {};

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Only orgs can request collaboration' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid event id' });

  const evt = await Event.findById(eventId).lean();
  if (!evt) return res.status(404).json({ message: 'Event not found' });

  // Disallow requests to past events
  if (isDateTimeInPast(evt.date, evt.time))
    return res.status(400).json({ message: 'Cannot request collaboration for a past event' });

  // Disallow if already has a collaborator
  if (evt.collaboratingOrgId)
    return res.status(409).json({ message: 'Event already has a collaborator; no more requests allowed' });

  // Disallow self-request
  if (String(evt.conductingOrgId) === actor.id)
    return res.status(400).json({ message: 'Conducting org cannot request collaboration on its own event' });

  // Disallow duplicate *pending* request from same org
  const existing = await Collabration.findOne({
    eventId,
    requesterOrgId: actor.id,
    status: 'pending',
  }).lean();
  if (existing) return res.status(409).json({ message: 'You already have a pending request for this event' });

  const doc = await Collabration.create({
    eventId,
    requesterOrgId: actor.id,
    note,
    status: 'pending',
  });

  // NOTIFICATION: notify conducting org about new request
  if (evt.conductingOrgId) {
    await notify({
      recipient: evt.conductingOrgId,
      recipientType: "Organization",

      actorId: actor.id,
      actorType: "Organization",

      type: "COLLAB_REQUEST",
      title: "New collaboration request",
      body: `${actor.username} requested collaboration for your event "${evt.name}".`,
      entityType: "Event",
      entityId: eventId,
      data: { requestId: doc._id }
    });
  }

  res.status(201).json({ message: 'Request created', request: doc });
});

// GET /api/events/:eventId/collab/requests/me
export const myCollabRequestStatus = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.params;

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Only orgs can check status' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid event id' });

  const evt = await Event.findById(eventId).select('collaboratingOrgId conductingOrgId date time').lean();
  if (!evt) return res.status(404).json({ message: 'Event not found' });

  if (evt.collaboratingOrgId && String(evt.collaboratingOrgId) !== actor.id) {
    return res.json({ status: 'blocked_by_existing_collab' });
  }

  const reqDoc = await Collabration.findOne({
    eventId,
    requesterOrgId: actor.id,
  }).sort({ createdAt: -1 }).lean(); // latest

  if (!reqDoc) return res.json({ status: 'not_requested' });

  return res.json({ status: reqDoc.status, request: reqDoc });
});

// GET /api/events/:eventId/collab/requests   (conducting org only)
export const listPendingRequests = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId } = req.params;

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Forbidden' });
  if (!isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid event id' });

  const evt = await Event.findById(eventId).select('conductingOrgId').lean();
  if (!evt) return res.status(404).json({ message: 'Event not found' });
  if (String(evt.conductingOrgId) !== actor.id)
    return res.status(403).json({ message: 'Only conducting org can view requests' });

  const items = await Collabration.find({ eventId, status: 'pending' })
    .populate('requesterOrgId', 'name username')
    .sort({ createdAt: 1 })
    .lean();

  res.json({ items });
});

// POST /api/events/:eventId/collab/requests/:requestId/accept  (conducting org only)
export const acceptRequest = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId, requestId } = req.params;

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Forbidden' });
  if (!isValidObjectId(eventId) || !isValidObjectId(requestId))
    return res.status(400).json({ message: 'Invalid ids' });

  const session = await mongoose.startSession();

  let updatedEvt = null;
  let reqDoc = null;

  try {
    await session.withTransaction(async () => {
      const evt = await Event.findOne({ _id: eventId }).session(session);
      if (!evt) throw new Error('Event not found');
      if (String(evt.conductingOrgId) !== actor.id) {
        const err = new Error('Only conducting org can accept'); err.statusCode = 403; throw err;
      }
      // not in past
      if (isDateTimeInPast(evt.date, evt.time)) {
        const err = new Error('Cannot accept collaboration for a past event'); err.statusCode = 400; throw err;
      }
      if (evt.collaboratingOrgId) {
        const err = new Error('Event already has a collaborator'); err.statusCode = 409; throw err;
      }

      reqDoc = await Collabration.findOne({ _id: requestId, eventId, status: 'pending' }).session(session);
      if (!reqDoc) {
        const err = new Error('Request not found or not pending'); err.statusCode = 404; throw err;
      }

      // Atomically set collaborator (ensure still null)
      updatedEvt = await Event.findOneAndUpdate(
        { _id: eventId, collaboratingOrgId: null },
        { $set: { collaboratingOrgId: reqDoc.requesterOrgId } },
        { new: true, session }
      );
      if (!updatedEvt) {
        const err = new Error('Another collaborator was set concurrently'); err.statusCode = 409; throw err;
      }

      // Mark this request accepted
      await Collabration.updateOne({ _id: reqDoc._id }, { $set: { status: 'accepted' } }, { session });

      // Auto-reject all other pending requests for this event
      await Collabration.updateMany(
        { eventId, status: 'pending', _id: { $ne: reqDoc._id } },
        { $set: { status: 'rejected' } },
        { session }
      );
    });

    // ✅ NOTIFICATION: notify requester org that request was accepted
    if (reqDoc?.requesterOrgId) {
      await notify({
        recipient: reqDoc.requesterOrgId,
        recipientType: "Organization",

        actorId: actor.id,
        actorType: "Organization",

        type: "COLLAB_ACCEPTED", // add in enum if you want distinct type
        title: "Collaboration accepted",
        body: `Your collaboration request for "${updatedEvt.name}" was accepted.`,
        entityType: "Event",
        entityId: eventId,
        data: { requestId }
      });
    }

    res.json({ message: 'Accepted', event: updatedEvt, acceptedRequestId: String(reqDoc._id) });

  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({ message: err.message || 'Accept failed' });
  } finally {
    session.endSession();
  }
});

// POST /api/events/:eventId/collab/requests/:requestId/reject  (conducting org only)
export const rejectRequest = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId, requestId } = req.params;

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Forbidden' });
  if (!isValidObjectId(eventId) || !isValidObjectId(requestId))
    return res.status(400).json({ message: 'Invalid ids' });

  const evt = await Event.findById(eventId).select('conductingOrgId name').lean();
  if (!evt) return res.status(404).json({ message: 'Event not found' });
  if (String(evt.conductingOrgId) !== actor.id)
    return res.status(403).json({ message: 'Only conducting org can reject' });

  const reqDoc = await Collabration.findOneAndUpdate(
    { _id: requestId, eventId, status: 'pending' },
    { $set: { status: 'rejected' } },
    { new: true }
  ).lean();

  if (!reqDoc) return res.status(404).json({ message: 'Request not found or not pending' });

  // NOTIFICATION: notify requester org rejected
  await notify({
    recipient: reqDoc.requesterOrgId,
    recipientType: "Organization",

    actorId: actor.id,
    actorType: "Organization",

    type: "COLLAB_REJECTED", // add in enum if you want distinct type
    title: "Collaboration rejected",
    body: `Your collaboration request for "${evt.name}" was rejected.`,
    entityType: "Event",
    entityId: eventId,
    data: { requestId }
  });

  res.json({ message: 'Rejected', request: reqDoc });
});

// DELETE /api/events/:eventId/collab/requests/:requestId  (requester can cancel if pending)
export const cancelMyRequest = asyncHandler(async (req, res) => {
  const { actor } = req;
  const { eventId, requestId } = req.params;

  if (actor?.type !== 'org') return res.status(403).json({ message: 'Forbidden' });
  if (!isValidObjectId(eventId) || !isValidObjectId(requestId))
    return res.status(400).json({ message: 'Invalid ids' });

  const reqDoc = await Collabration.findOneAndUpdate(
    { _id: requestId, eventId, requesterOrgId: actor.id, status: 'pending' },
    { $set: { status: 'cancelled' } },
    { new: true }
  ).lean();

  if (!reqDoc) return res.status(404).json({ message: 'No pending request found to cancel' });

  // ✅ NOTIFICATION: notify conducting org cancelled
  const evt = await Event.findById(eventId).select('conductingOrgId name').lean();
  if (evt?.conductingOrgId) {
    await notify({
      recipient: evt.conductingOrgId,
      recipientType: "Organization",

      actorId: actor.id,
      actorType: "Organization",

      type: "COLLAB_CANCELLED", // add in enum if you want distinct type
      title: "Collaboration request cancelled",
      body: `${actor.username} cancelled their collaboration request for "${evt.name}."`,
      entityType: "Event",
      entityId: eventId,
      data: { requestId }
    });
  }

  res.json({ message: 'Cancelled', request: reqDoc });
});
