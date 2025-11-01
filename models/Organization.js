import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email:    { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name:      { type: String, required: true, index: true },
    headName:  { type: String },
    type:      { type: String, enum: ['NGO','Govt','Company','Club','Other'], default: 'Other' },
    website:   { type: String },
    regId:     { type: String },
    affiliation:{ type: String },
    followersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
