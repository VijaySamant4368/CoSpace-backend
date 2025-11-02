import mongoose from 'mongoose';

const DonationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      index: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },

    amount: { type: Number, required: true, min: 0.01 },

    transactionId: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DonationSchema.index({ event: 1, status: 1, createdAt: -1 });
DonationSchema.index({ beneficiary: 1, status: 1, createdAt: -1 });
DonationSchema.index({ donor: 1, status: 1, createdAt: -1 });

export default mongoose.model('Donation', DonationSchema);
