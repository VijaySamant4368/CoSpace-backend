import asyncHandler from "../middleware/asyncHandler.js";
import Notification from "../models/Notification.js";

// GET /api/notifications?unreadOnly=true&page=1&limit=20
export const listMyNotifications = asyncHandler(async (req, res) => {
  const actor = req.actor; // from protect
  const actorId = actor._id || actor.id;

  const { unreadOnly = "false", limit = 20, page = 1 } = req.query;

  const recipientType = actor.type === "user" ? "User" : "Organization";

  const filter = { recipient: actorId, recipientType };
  if (unreadOnly === "true") filter.readAt = null;

  const items = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate("actorId", "username name profilePicture logo")
    .lean();

  res.json(items);
});

// PATCH /api/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const actor = req.actor;
  const actorId = actor._id || actor.id;

  const recipientType = actor.type === "user" ? "User" : "Organization";

  const notif = await Notification.findOneAndUpdate(
    { _id: id, recipient: actorId, recipientType },
    { readAt: new Date() },
    { new: true }
  ).lean();

  if (!notif) return res.status(404).json({ message: "Notification not found" });
  res.json(notif);
});

// PATCH /api/notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  const actor = req.actor;
  const actorId = actor._id || actor.id;

  const recipientType = actor.type === "user" ? "User" : "Organization";

  await Notification.updateMany(
    { recipient: actorId, recipientType, readAt: null },
    { readAt: new Date() }
  );

  res.json({ ok: true });
});
