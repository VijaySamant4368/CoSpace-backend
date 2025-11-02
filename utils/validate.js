import mongoose from 'mongoose';

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export function isValidDate(value) {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isValidTime(value) {
  // e.g. "00:00" → valid, "23:59" → valid, "25:00" → invalid
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}