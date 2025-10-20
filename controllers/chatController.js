import asyncHandler from '../middleware/asyncHandler.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

function actorToParticipant(actor) {
  return actor.type === 'org' ? 'Organization' : 'User';
}

export const listMyConversations = asyncHandler(async (req, res) => {
  const actorKind = actorToParticipant(req.actor);
  const actorDocId = (await (actorKind === 'User'
    ? User.findOne({ email: req.actor.email }).select('_id')
    : Organization.findOne({ email: req.actor.email }).select('_id')))._id;

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
  const chat = await Chat.findById(req.params.convoId).lean();
  if (!chat) return res.status(404).json({ message: 'Conversation not found' });
  res.json(chat);
});

export const listMessages = asyncHandler(async (req, res) => {
  const { convoId } = req.params;
  const { before, limit = 30 } = req.query;

  const chat = await Chat.findById(convoId).select('messages participants').lean();
  if (!chat) return res.status(404).json({ message: 'Conversation not found' });

  let msgs = chat.messages || [];
  if (before) msgs = msgs.filter(m => new Date(m.at) < new Date(before));
  msgs = msgs.sort((a,b) => new Date(b.at) - new Date(a.at)).slice(0, Number(limit));
  res.json(msgs);
});

export const addMessage = asyncHandler(async (req, res) => {
  const { convoId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'text required' });

  const senderKind = actorToParticipant(req.actor);
  const senderDocId = (await (senderKind === 'User'
    ? User.findOne({ email: req.actor.email }).select('_id')
    : Organization.findOne({ email: req.actor.email }).select('_id')))._id;

  const update = {
    $push: { messages: { senderKind, sender: senderDocId, encryptedText: text, at: new Date() } },
    $set:  { lastActivityAt: new Date() }
  };
  const ok = await Chat.updateOne(
    { _id: convoId, 'participants.kind': senderKind, 'participants.ref': senderDocId },
    update
  );
  if (!ok.matchedCount) return res.status(403).json({ message: 'Not a participant' });
  res.status(201).json({ ok: true });
});
