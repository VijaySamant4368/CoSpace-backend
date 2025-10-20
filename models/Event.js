import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String },
    date:        { type: Date, required: true },
    venue:       { type: String },
    conductingOrg:   { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    collaboratingOrg:{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    totalAttending: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
