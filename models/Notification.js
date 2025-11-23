import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // who receives it (User or Organization)
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientType",
      index: true,
    },
    recipientType: {
      type: String,
      required: true,
      enum: ["User", "Organization"],
      index: true,
    },

    // who triggered it (User or Organization)
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "actorType",
      default: null,
    },
    actorType: {
      type: String,
      enum: ["User", "Organization"],
      default: null,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "FOLLOW_ORG",         //For org   
        "EVENT_CREATED",
        "EVENT_REMINDER",
        "CHAT_MESSAGE",
        "COLLAB_REQUEST",     //For org   
        "DONATION_RECEIVED",  //For org   
        "COLLAB_ACCEPTED",    //For org   
        "COLLAB_REJECTED",    //For org   
        "COLLAB_CANCELLED",   //For org   
        "ATTEND_EVENT",       //For org   
        "EVENT_REVIEW",
        "VOLUNTEER_APPLIED",  //For org   
        "VOLUNTEER_APPROVED", //For user  
        "VOLUNTEER_REJECTED", //For yser  
      ],
      index: true,
    },

    title: { type: String, required: true },
    body: { type: String, default: "" },

    entityType: { type: String, default: null }, // "Event", "Donation", etc.
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    data: { type: Object, default: {} }, // extra payload for UI
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, recipientType: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
