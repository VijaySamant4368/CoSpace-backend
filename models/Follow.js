import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  },
  { timestamps: true }
);

followSchema.index({ user: 1, organization: 1 }, { unique: true });

export default mongoose.model('Follow', followSchema);
