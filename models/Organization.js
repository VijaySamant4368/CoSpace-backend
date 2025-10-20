import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, index: true },
    headName:  { type: String },
    type:      { type: String, enum: ['NGO','Govt','Company','Club','Other'], default: 'Other' },
    email:     { type: String },
    website:   { type: String },
    regId:     { type: String },
    affiliation:{ type: String },
    followersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
