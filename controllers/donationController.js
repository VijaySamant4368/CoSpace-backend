// controllers/donations.js
import crypto from 'crypto';
import mongoose from 'mongoose';
import Donation from '../models/Donation.js';
import Event from '../models/Event.js';

const toId = (id) => {
  try { return new mongoose.Types.ObjectId(id); } catch { return id; }
};

export const donate = async (req, res) => {
  try {
    const donorId = req.user?.id;
    if (!donorId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      eventId,
      amount,
      transactionId,
      status = 'completed',
      timestamp,
    } = req.body || {};

    if (!eventId) return res.status(400).json({ error: 'eventId is required' });

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt < 0.01) {
      return res.status(400).json({ error: 'amount must be >= 0.01' });
    }

    const ev = await Event.findById(eventId).select('_id').lean();
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    const txId = transactionId || `local_${crypto.randomUUID()}`;

    const donation = await Donation.create({
      donor: donorId,
      event: eventId,
      beneficiary: ev.conductingOrgId,
      amount: amt,
      transactionId: txId,
      status,
      timestamp: timestamp ? new Date(timestamp) : Date.now(),
    });

    return res.status(201).json({ donation });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.transactionId) {
      return res.status(409).json({ error: 'Duplicate transactionId' });
    }
    return res.status(500).json({ error: err.message || 'Failed to create donation' });
  }
};

/** GET /api/donations/user/:userId — all past donations by current user (ALL rows) */
export const userPastDonation = async (req, res) => {
  try {
    const donorId = req.params.userId;
    if (!donorId) return res.status(401).json({ error: 'Unauthorized' });

    const status = req.query.status; // optional

    const match = { donor: toId(donorId), ...(status && { status }) };

    const rows = await Donation.find(match)
      .sort({ createdAt: -1 })
      .populate('event', 'title name startsAt endsAt coverImage')
      .populate('beneficiary', 'name logo website') // will be null for event-only donations
      .lean();

    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load donations' });
  }
};

/** GET /api/donations/event/:eventId — all donations for an event (ALL rows) */
export const eventPastDonation = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });

    const status = req.query.status || 'completed';
    const match = { event: toId(eventId), ...(status && { status }) };

    const rows = await Donation.find(match)
      .sort({ createdAt: -1 })
      .populate('donor', 'name username')
      .lean();

    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load donations' });
  }
};


/** GET /api/donations/org/:orgId — all donations to one org (ALL rows) */
export const orgPastDonation = async (req, res) => {
  try {
    const orgId = req.params.orgId;
    if (!orgId) return res.status(400).json({ error: 'orgId is required' });

    const status = req.query.status || 'completed';
    const match = { beneficiary: toId(orgId), ...(status && { status }) };

    const rows = await Donation.find(match)
      .sort({ createdAt: -1 })
      .populate('donor', 'name username')
      .lean();

    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load donations' });
  }
};

/** GET /api/donations/org/:orgId/user/:userId — org donations by one user (ALL rows) */
export const orgPastDonationByUser = async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    if (!orgId) return res.status(400).json({ error: 'orgId is required' });
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const status = req.query.status || 'completed';
    const match = { beneficiary: toId(orgId), donor: toId(userId), ...(status && { status }) };

    const rows = await Donation.find(match)
      .sort({ createdAt: -1 })
      .populate('donor', 'name username')
      .lean();

    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load donations' });
  }
};
