import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email:    { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name:     { type: String, trim: true, default: 'Admin' },
    role:     { type: String, default: 'superadmin' },
    type:     { type: String, default: 'admin', immutable: true }
  },
  { timestamps: true }
);

export default mongoose.model('Admin', adminSchema);
