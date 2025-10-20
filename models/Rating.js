import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event:  { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    description: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

// one review per user per event
reviewSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
