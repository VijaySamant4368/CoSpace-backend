// temp.js — quick event participation + review injector 🧪

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// load environment (make sure your .env has MONGO_URI)
dotenv.config();

import User from './models/User.js';
import Event from './models/Event.js';
import Volunteer from './models/Volunteer.js';
import Attendance from './models/Attendance.js';
import Donation from './models/Donation.js';
import Review from './models/Review.js';

/* -------------------------------------------
   🔧 CONFIGURATION — set your test variables
------------------------------------------- */
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cospace';

// const USER_ID = '690f243a5257191af7d8636f';
// const USER_ID = '690f24325257191af7d86369';
// const USER_ID = '690f23ef5257191af7d86357';
const USER_ID = '690f22ff46321dadbad9c074';
const EVENT_ID = '690f262d5257191af7d86399';

const MAKE_VOLUNTEER = true;  // add user as volunteer
const MAKE_ATTENDEE = false;   // add user as participant
const MAKE_DONOR = false;      // add user as donor

const RATING = -1;             // range: -2 to 2
const COMMENT = 'Second Temporary test review added by temp.js 🧪'; // review text
/* ------------------------------------------- */

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findById(USER_ID);
    if (!user) throw new Error('User not found');
    const event = await Event.findById(EVENT_ID);
    if (!event) throw new Error('Event not found');

    console.log(`👤 User: ${user.username} (${user._id})`);
    console.log(`🎉 Event: ${event.name} (${event._id})`);

    // ----- Attendance -----
    if (MAKE_ATTENDEE) {
      try {
        await Attendance.create({ user: user._id, event: event._id });
        await Event.findByIdAndUpdate(event._id, { $inc: { totalAttending: 1 } });
        console.log('🧾 Added attendee');
      } catch (e) {
        if (e.code === 11000) console.log('↩️ Already marked as attendee');
        else console.error('❌ Attendance error:', e.message);
      }
    }

    // ----- Volunteer -----
    if (MAKE_VOLUNTEER) {
      try {
        await Volunteer.create({ user: user._id, event: event._id, status: 'approved' });
        await Event.findByIdAndUpdate(event._id, { $inc: { totalVolunteering: 1 } });
        console.log('💪 Added volunteer');
      } catch (e) {
        if (e.code === 11000) console.log('↩️ Already marked as volunteer');
        else console.error('❌ Volunteer error:', e.message);
      }
    }

    // ----- Donation -----
    if (MAKE_DONOR) {
      try {
        await Donation.create({
          donor: user._id,
          event: event._id,
          beneficiary: event.conductingOrgId,
          amount: 100,
          transactionId: `TEST_TXN_${Date.now()}`,
          status: 'completed',
        });
        console.log('💰 Added donation');
      } catch (e) {
        if (e.code === 11000) console.log('↩️ Duplicate donation transaction');
        else console.error('❌ Donation error:', e.message);
      }
    }

    // ----- Review -----
    try {
      await Review.create({
        user: user._id,
        event: event._id,
        rating: RATING,
        comment: COMMENT,
        isVolunteer: MAKE_VOLUNTEER,
        isParticipant: MAKE_ATTENDEE,
        isDonor: MAKE_DONOR,
      });
      console.log('⭐ Added review');
    } catch (e) {
      if (e.code === 11000) console.log('↩️ Review already exists for this user/event');
      else console.error('❌ Review error:', e.message);
    }

    console.log('✅ All done!');

  } catch (err) {
    console.error('❌ Script error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main();
