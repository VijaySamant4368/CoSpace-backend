import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    description: { type: String },
  },
  { timestamps: true }
);

certificateSchema.index({ user: 1, organization: 1, title: 1 }, { unique: true });

export default mongoose.model('Certificate', certificateSchema);
