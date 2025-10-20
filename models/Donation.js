import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    beneficiary: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true, },
    amount: { type: Number, required: true, min: 0 },
    transactionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending','completed','failed','refunded'], default: 'pending' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Donation', donationSchema);
