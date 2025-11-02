import asyncHandler from '../middleware/asyncHandler.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

function actorToParticipant(actor) {
  return actor?.type === 'org' ? 'Organization' : 'User';
}

async function getActorDocId(actorKind, actor) {
  const actorDoc = await (
    actorKind === 'User'
      ? User.findOne({ email: actor.email }).select('_id')
      : Organization.findOne({ email: actor.email }).select('_id')
  );
  return actorDoc?._id || null;
}

// Helper: ensure the requester is a participant; returns the chat (lean) or null
async function assertIsParticipant({ convoId, actor }) {
  const actorKind = actorToParticipant(actor);
  const actorDocId = await getActorDocId(actorKind, actor);
  if (!actorDocId) return null;

  const chat = await Chat.findOne({
    _id: convoId,
    'participants.kind': actorKind,
    'participants.ref': actorDocId,
  }).lean();

  return chat;
}

export const listMyConversations = asyncHandler(async (req, res) => {
  const actorKind = actorToParticipant(req.actor);
  const actorDocId = await getActorDocId(actorKind, req.actor);
  if (!actorDocId) return res.status(401).json({ message: 'Actor not found' });

  const items = await Chat.find({
    'participants.kind': actorKind,
    'participants.ref': actorDocId
  })
  .sort({ lastActivityAt: -1 })
  .select({ participants: 1, lastActivityAt: 1, messages: { $slice: -1 } })
  .lean();

  res.json(items);
});

export const getConversation = asyncHandler(async (req, res) => {
  const chat = await assertIsParticipant({ convoId: req.params.convoId, actor: req.actor });
  if (!chat) return res.status(404).json({ message: 'Conversation not found' });
  res.json(chat);
});

export const listMessages = asyncHandler(async (req, res) => {
  const chat = await assertIsParticipant({ convoId: req.params.convoId, actor: req.actor });
  if (!chat) return res.status(404).json({ message: 'Conversation not found' });

  const { before, limit = 30 } = req.query;

  // Coerce and bound limit (1..100)
  const lim = Math.max(1, Math.min(100, Number(limit) || 30));

  let msgs = chat.messages || [];

  if (before) {
    const d = new Date(before);
    if (!Number.isFinite(d.getTime())) {
      return res.status(400).json({ message: 'Invalid "before" date' });
    }
    msgs = msgs.filter(m => new Date(m.at) < d);
  }

  // sort desc by "at" then slice
  msgs = msgs
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, lim);

  res.json(msgs);
});

export const addMessage = asyncHandler(async (req, res) => {
  const { convoId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'text required' });

  const senderKind = actorToParticipant(req.actor);
  const senderDocId = await getActorDocId(senderKind, req.actor);
  if (!senderDocId) return res.status(401).json({ message: 'Actor not found' });

  // Only allow participants to write
  const match = {
    _id: convoId,
    'participants.kind': senderKind,
    'participants.ref': senderDocId
  };

  const update = {
    $push: { messages: { senderKind, sender: senderDocId, encryptedText: text, at: new Date() } },
    $set:  { lastActivityAt: new Date() }
  };

  const result = await Chat.updateOne(match, update);

  if (!result.matchedCount) return res.status(403).json({ message: 'Not a participant' });

  res.status(201).json({ ok: true });
});
