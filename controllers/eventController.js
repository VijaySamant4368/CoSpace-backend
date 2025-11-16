import asyncHandler from "../middleware/asyncHandler.js";
import Event from "../models/Event.js";
import Attendance from "../models/Attendance.js";
import { isValidDate, isValidObjectId, isValidTime } from "../utils/validate.js";
import { uploadImage, updateImage, deleteImage } from "../utils/image.js";
import { isDateTimeInPast } from "../utils/time.js";
import Volunteer from "../models/Volunteer.js";
import Collaboration from '../models/Collaboration.js';

export const listEvents = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = q ? { name: new RegExp(q, "i") } : {};
  const items = await Event.find(filter).sort({ date: 1 }).limit(200).lean();
  res.json(items);
});

export const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id))
    return res.status(400).json({ message: "Invalid event ID" });

  const evt = await Event.findById(id).lean();
  if (!evt) return res.status(404).json({ message: "Event not found" });
  res.json(evt);
});

export const createEvent = asyncHandler(async (req, res) => {
  const { actor } = req;
  if (actor?.type !== "org")
    return res.status(403).json({ message: "Only organizations can create events" });

  const { name, description, date, time, venue, isVirtual, skills } = req.body;
  if (!name || !date || !time)
    return res.status(400).json({ message: "Missing required fields (name, date, time)" });
  if (!isValidDate(date))
    return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
  if (!isValidTime(time))
      return res.status(400).json({ message: "Invalid time format. Use HH:mm (24-hour)." });
  if (isDateTimeInPast(date, time))
    return res.status(400).json({ message: "Cannot create an event in past" });

  const skillsArray = Array.isArray(skills)
    ? skills
    : String(skills || "").split(",").map(s => s.trim()).filter(Boolean);

  const imageUrl = req.file ? await uploadImage(req.file) : null;

  const event = await Event.create({
    name,
    description,
    date,
    time,
    venue,
    isVirtual: !!isVirtual,
    skills: skillsArray,
    image: imageUrl,
    conductingOrgId: actor.id,
    collaboratingOrgId: null,
  });

  res.status(201).json({ message: "Event created successfully", event });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actor } = req;
  const allowedFields = ['name', 'description', 'date', 'time', 'venue', 'isVirtual', 'image', 'skills']; // whitelist
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
  );

  if (!isValidObjectId(id))
    return res.status(400).json({ message: "Invalid event ID" });

  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (String(event.conductingOrgId) !== actor.id)
    return res.status(403).json({ message: "Not authorized to edit this event" });

  if (updates.date && !isValidDate(updates.date))
    return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });

  if (updates.skills) {
    updates.skills = Array.isArray(updates.skills)
      ? updates.skills
      : String(updates.skills).split(",").map(s => s.trim()).filter(Boolean);
  }

  if (req.file) {
    updates.image = event.image
      ? await updateImage(event.image, req.file)
      : await uploadImage(req.file);
  }

  Object.assign(event, updates);
  await event.save();
  res.json({ message: "Event updated successfully", event });
});

export const getEventsByOrg = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  if (!isValidObjectId(orgId))
    return res.status(400).json({ message: "Invalid organization ID" });

  const events = await Event.find({
    $or: [{ conductingOrgId: orgId }, { collaboratingOrgId: orgId }],
  })
    .sort({ date: -1 })
    .lean();

  res.json({ orgId, count: events.length, events });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actor } = req;

  if (!isValidObjectId(id))
    return res.status(400).json({ message: "Invalid event ID" });

  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (actor?.type !== "org" || actor.id !== String(event.conductingOrgId))
    return res.status(403).json({ message: "Not authorized to delete this event" });

  // Check if the current date and time is before the event's date and time
  if (isDateTimeInPast(event.date, event.time))
    return res.status(400).json({ message: "Cannot delete an event that already occured" });

  await Collaboration.deleteMany({ eventId: id });
  await Attendance.deleteMany({ event: id });
  if (event.image) await deleteImage(event.image);
  await event.deleteOne();

  res.json({ message: "Event deleted successfully", deleted: true });
});

export const getEventStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid event id' });
  }

  const [participants, volunteers, pending] = await Promise.all([
    Attendance.countDocuments({ event: id}),
    Volunteer.countDocuments({ event: id, status: 'approved' }),
    Volunteer.countDocuments({ event: id, status: 'pending' }),
  ]);

  res.json({ participants, volunteers, pending });
});