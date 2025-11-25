import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import bcrypt from 'bcrypt';
import { issueToken } from '../middleware/auth.js';
import { uploadImage } from '../utils/image.js';
import Admin from '../models/Admin.js';

// number of salt rounds (10–12 is a good default)
const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hashed;
}

export async function verifyPassword(plainPassword, storedHash) {
  const isMatch = await bcrypt.compare(plainPassword, storedHash);
  return isMatch;
}

export const login = asyncHandler(async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email & password required' });

  email = String(email).toLowerCase();

  const user = await User.findOne({ email }).lean();
  const org  = user ? null : await Organization.findOne({ email }).lean();
  const admin = (user || org) ? null : await Admin.findOne({ email }).lean();

  const actor =
    user  ? { ...user, type: 'user' } :
    org   ? { ...org, type: 'org' }  :
    admin ? { ...admin, type: 'admin' } :
    null;

  if (!actor?.passwordHash) return res.status(404).json({ message: 'Account not found' });

  const ok = await verifyPassword(password, actor.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = issueToken(actor);

  res.json({
    token,
    user: {
      name: actor.name,
      email: actor.email,
      type: actor.type,
      username: actor.username,
      ...(actor.type === 'org' ? { verified: actor.verified } : {})
    }
  });
});

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const signup = asyncHandler(async (req, res) => {
  let { type, name, email, password, username, headName, interests, regId, dob, bio, mission, website, affiliation, orgType, upi } = req.body || {};
  if (!type || !['user','org'].includes(type))
    return res.status(400).json({ message: 'type must be "user" or "org"' });
  if (!name || !email || !password || !username)
    return res.status(400).json({ message: 'name, email, password, username are required' });

  email = String(email).trim().toLowerCase();
  username = String(username).trim().toLowerCase();
  if (!USERNAME_RE.test(username))
    return res.status(400).json({ message: 'Invalid username. Use 3–32 chars: a–z, 0–9, dot, _, -.' });

  // interests can come as CSV or array (only for user)
  let interestsArr = [];
  if (type === 'user' && typeof interests !== 'undefined') {
    interestsArr = Array.isArray(interests)
      ? interests
      : String(interests || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
  }

  const [emailUsedByUser, emailUsedByOrg, unameUsedByUser, unameUsedByOrg] = await Promise.all([
    User.exists({ email }),
    Organization.exists({ email }),
    User.exists({ username }),
    Organization.exists({ username }),
  ]);
  if (emailUsedByUser || emailUsedByOrg) return res.status(409).json({ message: 'Email already in use' });
  if (unameUsedByUser || unameUsedByOrg) return res.status(409).json({ message: 'Username already in use' });

  const passwordHash = await hashPassword(password);

  let profilePicture = null;
  if (req.file?.path) {
    profilePicture = await uploadImage(req.file);
  }

  try {
    if (type === 'user') {
      const doc = await User.create({ name, email, username, passwordHash, profilePicture, interests: interestsArr, bio });
      const token = issueToken({ id: doc._id, email: doc.email, type, username: doc.username });
      return res.status(201).json({
        token,
        user: { id: doc._id, type, name: doc.name, email: doc.email, username: doc.username, profilePicture: doc.profilePicture },
      });
    } else {
      const doc = await Organization.create({ name, email, headName, username, passwordHash, profilePicture, regId, mission, website, affiliation, orgType, upi });
        const token = issueToken({ id: doc._id, email: doc.email, type, username: doc.username });
      return res.status(201).json({
        token,
        user: { id: doc._id, type, name: doc.name, email: doc.email, username: doc.username, profilePicture: doc.profilePicture },
      });
    }
  } catch (error) {
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `Duplicate ${field}` });
    }
    throw error;
  }
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { actor } = req; // comes from protect() middleware
  if (!actor) return res.status(401).json({ message: 'Not authorized' });
  let oldDoc;
  if (actor.type == "user"){
    oldDoc = await User.findById(actor.id)
  }
  if (actor.type == "org"){
    oldDoc = await Organization.findById(actor.id)
  }
  const storedHash = oldDoc.passwordHash;

  const { name, username, bio, interests, headName, website, regId, affiliation, type, mission, currentPassword, newPassword, upi} = req.body || {};
  let updateData = {};

  if (newPassword){
    if (!verifyPassword(currentPassword, storedHash)) return res.status(401).json({ message: 'Entered wrong password' });
    const newHash = await hashPassword(newPassword);
    updateData.passwordHash = newHash;
  }
  if (name) updateData.name = name;
  if (username) updateData.username = username.trim().toLowerCase();


  if (req.file?.path) {
    try {
      const uploadedUrl = await uploadImage(req.file);
      updateData.profilePicture = uploadedUrl;
      try { fs.unlinkSync(req.file.path); } catch {}
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  }

  let updatedDoc;
  if (actor.type === 'user') {
    if (bio) updateData.bio = bio;
    if (interests) {
      updateData.interests = Array.isArray(interests)
        ? interests
        : String(interests)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    updatedDoc = await User.findByIdAndUpdate(actor.id, updateData, { new: true }).select('-passwordHash');
  } else if (actor.type === 'org') {
    if (headName) updateData.headName = headName;
    if (website) updateData.website = website;
    if (regId) updateData.regId = regId;
    if (affiliation) updateData.affiliation = affiliation;
    if (upi) updateData.upi = upi;
    if (type) updateData.type = type;
    if (mission) updateData.mission= mission;
    updatedDoc = await Organization.findByIdAndUpdate(actor.id, updateData, { new: true }).select('-passwordHash');
  } else {
    return res.status(400).json({ message: 'Unknown account type' });
  }

  res.json({
    message: 'Profile updated successfully',
    user: updatedDoc,
  });
});


import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import Follow from '../models/Follow.js';
import Chat from '../models/Chat.js';
import Event from '../models/Event.js';
import Volunteer from '../models/Volunteer.js';

// import Message from '../models/Message.js'; // if you have a separate messages collection
export const deleteAccount = asyncHandler(async (req, res) => {
  const { actor } = req;
  if (!actor) return res.status(401).json({ message: 'Not authorized' });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const actorId = actor.id;
    const actorType = actor.type; // 'user' | 'org'

    if (actorType === 'user') {
      // collect affected orgs/events for counter dec
      const [userFollows, userAttendances, userVolunteers] = await Promise.all([
        Follow.find({ user: actorId }).session(session).select('organization').lean(),
        Attendance.find({ user: actorId }).session(session).select('event').lean(),
        Volunteer.find({ user: actorId }).session(session).select('event status').lean(),
      ]);

      // dec followersCount on orgs the user followed
      if (userFollows.length) {
        const ops = userFollows.map(f => ({
          updateOne: {
            filter: { _id: f.organization },
            update: { $inc: { followersCount: -1 } },
          }
        }));
        await Organization.bulkWrite(ops, { session });
      }

      // dec totalAttending on events the user attended
      if (userAttendances.length) {
        const ops = userAttendances.map(a => ({
          updateOne: {
            filter: { _id: a.event },
            update: { $inc: { totalAttending: -1 } },
          }
        }));
        await Event.bulkWrite(ops, { session });
      }

      // dec totalVolunteering only for approved ones (if you track it)
      const approvedVols = userVolunteers.filter(v => v.status === 'approved');
      if (approvedVols.length) {
        const ops = approvedVols.map(v => ({
          updateOne: {
            filter: { _id: v.event },
            update: { $inc: { totalVolunteering: -1 } },
          }
        }));
        await Event.bulkWrite(ops, { session });
      }

      // delete edges
      await Promise.all([
        Follow.deleteMany({ user: actorId }).session(session),
        Attendance.deleteMany({ user: actorId }).session(session),
        Volunteer.deleteMany({ user: actorId }).session(session),
      ]);

      // chats (and optionally messages) where this user participates
      const chatIds = await Chat.find({
        'participants.kind': 'user',
        'participants.ref': actorId,
      }).session(session).distinct('_id');

      if (chatIds.length) {
        // await Message.deleteMany({ chat: { $in: chatIds } }).session(session);
        await Chat.deleteMany({ _id: { $in: chatIds } }).session(session);
      }

      await User.findByIdAndDelete(actorId).session(session);

    } else if (actorType === 'org') {
      // dec followingCount on users who followed this org
      const orgFollowers = await Follow.find({ organization: actorId })
        .session(session)
        .select('user')
        .lean();

      if (orgFollowers.length) {
        const ops = orgFollowers.map(f => ({
          updateOne: {
            filter: { _id: f.user },
            update: { $inc: { followingCount: -1 } },
          }
        }));
        await User.bulkWrite(ops, { session });
      }

      await Follow.deleteMany({ organization: actorId }).session(session);

      // delete events conducted by org (and their attendance/volunteers)
      const conductingIds = await Event.find({ conductingOrgId: actorId })
        .session(session)
        .distinct('_id');

      if (conductingIds.length) {
        await Promise.all([
          Attendance.deleteMany({ event: { $in: conductingIds } }).session(session),
          Volunteer.deleteMany({ event: { $in: conductingIds } }).session(session),
          Event.deleteMany({ _id: { $in: conductingIds } }).session(session),
        ]);
      }

      // collaborations where org is collaborator → just unset
      await Event.updateMany(
        { collaboratingOrgId: actorId },
        { $unset: { collaboratingOrgId: 1 } }
      ).session(session);

      // chats (and optionally messages) where this org participates
      const chatIds = await Chat.find({
        'participants.kind': 'org',
        'participants.ref': actorId,
      }).session(session).distinct('_id');

      if (chatIds.length) {
        // await Message.deleteMany({ chat: { $in: chatIds } }).session(session);
        await Chat.deleteMany({ _id: { $in: chatIds } }).session(session);
      }

      await Organization.findByIdAndDelete(actorId).session(session);

    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Unknown account type' });
    }
    await session.commitTransaction();
    session.endSession();
    return res.json({ message: 'Account and related data deleted' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Delete failed:', err);
    return res.status(500).json({ message: 'Failed to delete account' });
  }
});



//To know if the actor is user or org
export const verify = asyncHandler(async (req, res) => {
  //`protect()` already validated
  const { actor } = req;
  if (!actor) return res.json({ user: null });
  if (actor.type == 'user') {
    res.json({ user: actor })
  }
  if (actor.type == 'org') res.json({ org: actor });
});
