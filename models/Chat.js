import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['User', 'Organization'], required: true },
    ref:  { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'participants.kind' },
    lastReadAt: { type: Date, default: new Date(0) }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    senderKind: { type: String, enum: ['User', 'Organization'], required: true },
    sender:     { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'messages.senderKind' },
    encryptedText: { type: String, required: true },  
    at:            { type: Date, default: Date.now }
  },
  { _id: true }
);

const chatSchema = new mongoose.Schema(
  { 
    participants: {
      type: [participantSchema],
      validate: v => Array.isArray(v) && v.length === 2,
      required: true
    },

    messages: { type: [messageSchema], default: [] },
    
    lastActivityAt: { type: Date, default: Date.now }       //To sort the inbox/chatPage
  },
  { timestamps: true }
);

chatSchema.pre('save', function () {
  if (this.isModified('messages')) this.lastActivityAt = new Date();    //Update the last activityTime (for sorting inbox)
});

chatSchema.index({ lastActivityAt: -1 });
chatSchema.index({ 'participants.kind': 1, 'participants.ref': 1 });

export default mongoose.model('Chat', chatSchema);