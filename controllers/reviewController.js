import jwt from 'jsonwebtoken';
import Review from '../models/Review.js';
import Event from '../models/Event.js';
import Attendance from '../models/Attendance.js';
import Volunteer from '../models/Volunteer.js';
import Donation from '../models/Donation.js';

/* ---------- Helpers ---------- */
function buildEventDateTime(event) {
  const [hh = '00', mm = '00'] = String(event.time || '').split(':');
  const dt = new Date(event.date);
  dt.setHours(Number(hh), Number(mm), 0, 0);
  return dt;
}
function hasEventPassed(event) {
  return buildEventDateTime(event).getTime() <= Date.now();
}
async function getRoleFlags(userId, eventId) {
  const [isVolunteer, isParticipant, isDonor] = await Promise.all([
    Volunteer.exists({ user: userId, event: eventId, status: 'approved' }),
    Attendance.exists({ user: userId, event: eventId }),
    Donation.exists({ donor: userId, event: eventId, status: 'completed' }),
  ]);
  return {
    isVolunteer: !!isVolunteer,
    isParticipant: !!isParticipant,
    isDonor: !!isDonor,
  };
}

/* ---------- Controllers ---------- */

// POST /reviews/:eventId  (protected)
export async function addReview(req, res) {
  try {
    if (!req.actor || req.actor.type !== 'user')
      return res.status(403).json({ message: 'Only users can post reviews.' });

    const { eventId } = req.params;
    const { rating, comment } = req.body;
    if (!eventId || typeof rating !== 'number')
      return res.status(400).json({ message: 'eventId (URL) and numeric rating are required.' });
    if (rating < -2 || rating > 2)
      return res.status(400).json({ message: 'Rating must be between -2 and 2.' });

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!hasEventPassed(event))
      return res.status(400).json({ message: 'Reviews can only be posted after the event has passed.' });

    const userId = req.actor.id;
    const roles = await getRoleFlags(userId, eventId);
    if (!roles.isVolunteer && !roles.isParticipant && !roles.isDonor)
      return res.status(403).json({ message: 'You must be a volunteer, participant, or donor to review this event.' });

    const review = await Review.create({
      user: userId,
      event: eventId,
      rating,
      comment,
      ...roles,
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'You have already reviewed this event.' });
    console.error(err);
    res.status(500).json({ message: 'Failed to create review.' });
  }
}

// GET /reviews/:id
export async function getReview(req, res) {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'username name profilePicture')
      .populate('event', 'name date time')
      .lean();
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    res.json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch review.' });
  }
}

// DELETE /reviews/:id  (protected)
export async function deleteReview(req, res) {
  try {
    if (!req.actor || req.actor.type !== 'user')
      return res.status(403).json({ message: 'Only users can delete reviews.' });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    if (String(review.user) !== String(req.actor.id))
      return res.status(403).json({ message: 'You can only delete your own review.' });

    await review.deleteOne();
    res.json({ message: 'Review deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete review.' });
  }
}

/* ---------- PUBLIC READ ---------- */
// GET /reviews/event/:eventId/by-role
export async function getEventReviewsByRole(req, res) {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    if (!hasEventPassed(event))
      return res.status(403).json({ message: 'Reviews are only available after the event has passed.' });

    // optional auth → figure out viewer eligibility
    let viewerEligible = false;
    const auth = req.headers.authorization || '';
    const token = auth.split(' ')[1];
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload?.type === 'user') {
          const roles = await getRoleFlags(payload.sub, eventId);
          viewerEligible = roles.isVolunteer || roles.isParticipant || roles.isDonor;
        }
      } catch {
        // ignore invalid/expired token
      }
    }

    const allReviews = await Review.find({ event: eventId })
      .populate('user', 'username name profilePicture')
      .lean();

    const volunteers = allReviews.filter(r => r.isVolunteer);
    const participants = allReviews.filter(r => r.isParticipant);
    const donors = allReviews.filter(r => r.isDonor);

    res.json({ volunteers, participants, donors, viewerEligible });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch reviews.' });
  }
}
