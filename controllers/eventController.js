import asyncHandler from '../middleware/asyncHandler.js';
import Event from '../models/Event.js';

export const listEvents = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = q ? { name: new RegExp(q, 'i') } : {};
  const items = await Event.find(filter).sort({ date: 1 }).limit(200).lean();
  res.json(items);
});

export const getEventById = asyncHandler(async (req, res) => {
  const evt = await Event.findById(req.params.id).lean();
  if (!evt) return res.status(404).json({ message: 'Event not found' });
  res.json(evt);
});
