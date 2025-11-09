import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    comment: { type: String, trim: true, maxlength: 2000 },

    rating: { 
      type: Number, 
      required: true, 
      min: -2, 
      max: 2 
    },

    event: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Event', 
      required: true, 
      index: true 
    },

    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },

    // Role flags (can overlap)
    isVolunteer:   { type: Boolean, default: false },
    isParticipant: { type: Boolean, default: false },
    isDonor:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate reviews for same user+event
reviewSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
