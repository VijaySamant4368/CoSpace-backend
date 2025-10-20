import mongoose from 'mongoose';

const volunteerSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    // role:  { type: String }
  },
  { timestamps: true }
);

volunteerSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model('Volunteer', volunteerSchema);
