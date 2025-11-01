import mongoose from 'mongoose';

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export function isValidDate(value) {
  const date = new Date(value);
  return !isNaN(date.getTime());
}