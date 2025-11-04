import mongoose from 'mongoose';

const collaborationSchema = new mongoose.Schema({
  eventId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  requesterOrgId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  status:          { type: String, enum: ['pending','accepted','rejected','cancelled'], default: 'pending', index: true },
  note:            { type: String, default: '' },
}, { timestamps: true });

collaborationSchema.index(
  { eventId: 1, requesterOrgId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model('Collaboration', collaborationSchema);
