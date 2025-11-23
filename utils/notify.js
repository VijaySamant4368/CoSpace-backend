import Notification from "../models/Notification.js";

/**
 * Version B notify helper
 * REQUIRED: recipient + recipientType
 * OPTIONAL: actorId + actorType
 */
export const notify = async ({
  recipient,
  recipientType, // "User" | "Organization"
  actorId = null,
  actorType = null, // "User" | "Organization"
  type,
  title,
  body = "",
  entityType = null,
  entityId = null,
  data = {},
}) => {
  if (!recipient || !recipientType) return null;

  return Notification.create({
    recipient,
    recipientType,
    actorId,
    actorType,
    type,
    title,
    body,
    entityType,
    entityId,
    data,
  });
};
