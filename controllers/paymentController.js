// controllers/paymentController.js
import Razorpay from "razorpay";
import crypto from "crypto";
import Donation from "../models/Donation.js";
import Event from "../models/Event.js";

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
    const donorId = req.actor?.id;              // from protect middleware
    if (!donorId) return res.status(401).json({ error: "Unauthorized" });

    const { amount, currency = "INR", eventId } = req.body || {};

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt < 0.01) {
      return res.status(400).json({ error: "amount must be >= 0.01" });
    }

    const ev = await Event.findById(eventId)
      .select("_id conductingOrgId")
      .lean();
    if (!ev) return res.status(404).json({ error: "Event not found" });

    // Razorpay expects amount in paise
    const amountInPaise = Math.round(amt * 100);

    const options = {
      amount: amountInPaise,
      currency,
      payment_capture: 1,
      notes: {
        donorId: donorId || "",
        eventId: eventId || "",
      },
    };

    const order = await razorpay.orders.create(options);

    // Create Donation with status "pending"
    const donation = await Donation.create({
      donor: donorId,
      event: eventId,
      beneficiary: ev.conductingOrgId || null,
      amount: amt,
      transactionId: order.id,    // Razorpay order id
      status: "pending",
      timestamp: Date.now(),
    });

    return res.status(201).json({
      orderId: order.id,
      amount: order.amount,       // paise
      currency: order.currency,
      donationId: donation._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    // handle duplicate transactionId
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
 */
export const verifyPayment = async (req, res) => {
  try {
    const donorId = req.user?.id;
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
