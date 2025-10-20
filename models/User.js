import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email:    { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name:     { type: String, trim: true },
    dob:      { type: Date },
    bio:      { type: String, trim: true, maxlength: 1000 },
    interests:{ type: [String], default: [] },
    followingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
