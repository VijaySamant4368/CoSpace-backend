// controllers/paymentController.js
import Razorpay from "razorpay";
import crypto from "crypto";
import Donation from "../models/Donation.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { notify } from "../utils/notify.js";

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/payment/create
 * Body: { amount: number (in RUPEES), eventId: string }
 *
 * 1. Creates Razorpay order (amount in paise)
 * 2. Creates Donation with status "pending" and transactionId = order.id
 * 3. Returns order info for frontend Razorpay Checkout
 */
export const createPayment = async (req, res) => {
  try {
    const donorId = req.actor?.id;
    if (!donorId) return res.status(401).json({ error: "Unauthorized" });

    const { amount, currency = "INR", eventId, orgId } = req.body || {};

    // Must have either eventId or orgId
    if (!eventId && !orgId) {
      return res.status(400).json({ error: "eventId or orgId is required" });
    }

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt < 0.01) {
      return res.status(400).json({ error: "amount must be >= 0.01" });
    }

    let beneficiaryOrgId = null;
    let event = null;

    if (eventId) {
      event = await Event.findById(eventId)
        .select("_id conductingOrgId name")
        .lean();
      if (!event) return res.status(404).json({ error: "Event not found" });

      beneficiaryOrgId = event.conductingOrgId || null;
    } else {
      // orgId flow (no event)
      beneficiaryOrgId = orgId;
    }

    const options = {
      amount: amt, // paise (don’t change)
      currency,
      payment_capture: 1,
      notes: {
        donorId: donorId || "",
        eventId: eventId || "",
        orgId: beneficiaryOrgId || "",
      },
    };

    const order = await razorpay.orders.create(options);

    // Create Donation with status "pending"
    const donation = await Donation.create({
      donor: donorId,
      event: eventId || null,
      beneficiary: beneficiaryOrgId || null,
      amount: amt,
      transactionId: order.id, // Razorpay order id
      status: "pending",
      timestamp: Date.now(),
    });

    // SEND NOTIFICATION TO BENEFICIARY ORG ON SUCCESS
    if (donation.beneficiary) {
      const donor = await User.findById(donorId).select("username name").lean();

      let eventName = "";
      if (donation.event) {
        const evDoc = await Event.findById(donation.event).select("name").lean();
        eventName = evDoc?.name || "event";
      }

      await notify({
        recipient: donation.beneficiary,
        recipientType: "Organization",

        actorId: donorId,
        actorType: "User",

        type: "DONATION_RECEIVED",
        title: "New donation received",
        body: `${donor?.username || "A user"} donated ₹${donation.amount / 100} to your ${eventName? `event ${eventName}` : `organization`}.`,

        entityType: "Donation",
        entityId: donation._id,

        data: {
          amount: donation.amount,
          eventId: donation.event,
          donorId,
          orgId: donation.beneficiary,
          paymentId: donation._id,
        },
      });
    }

    return res.status(201).json({
      orderId: order.id,
      amount: order.amount, // paise
      currency: order.currency,
      donationId: donation._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    if (err.code === 11000 && err.keyPattern?.transactionId) {
      return res.status(409).json({ error: "Duplicate transactionId" });
    }
    return res.status(500).json({ error: "Unable to create order" });
  }
};

/**
 * POST /api/payment/verify
 * Body from Razorpay handler:
 * {
 *   razorpay_order_id,
 *   razorpay_payment_id,
 *   razorpay_signature
 * }
 *
 * 1. Verifies Razorpay signature
 * 2. Finds Donation by transactionId (== razorpay_order_id)
 * 3. Updates status -> completed / failed
 * 4. ✅ Sends notification on completed
 */
export const verifyPayment = async (req, res) => {
  try {
    const donorId = req.actor?.id || req.user?.id;
    if (!donorId) return res.status(401).json({ error: "Unauthorized" });

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    // Find the pending donation we created in createPayment()
    const donation = await Donation.findOne({
      transactionId: razorpay_order_id,
      donor: donorId,
    });

    if (!donation) {
      return res.status(404).json({ error: "Donation not found for this order" });
    }

    if (!isValid) {
      donation.status = "failed";
      await donation.save();
      return res
        .status(400)
        .json({ success: false, error: "Invalid signature", donation });
    }

    // Mark as completed
    donation.status = "completed";
    await donation.save();

    return res.json({ success: true, donation });
  } catch (err) {
    console.error("Error verifying payment:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
};
