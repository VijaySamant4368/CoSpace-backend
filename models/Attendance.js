import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  },
  { timestamps: true }
);

// prevent duplicate pairs
attendanceSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
