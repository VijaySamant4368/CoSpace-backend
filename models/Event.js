import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String },
    date:        { type: Date, required: true },
    time:        { type: String, required: true },  // Stored in HH:MM (24hr) format
    venue:       { type: String },
    isVirtual:   { type: Boolean, default: false },

    image:       { type: String, default: null },   // store image URL or path
    skills:      { type: [String], default: [] },   // volunteer skills/roles
    
    conductingOrgId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    collaboratingOrgId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

    totalAttending: { type: Number, default: 0 },
    totalVolunteering: { type: Number, default: 0 },
  },
  { timestamps: true }
);

eventSchema.index({ conductingOrgId: 1, date: 1 });
eventSchema.index({ collaboratingOrgId: 1 });

export default mongoose.model('Event', eventSchema);
