import mongoose from "mongoose";

const { Schema } = mongoose;

const rsvpSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    guestName: {
      type: String,
      trim: true,
      default: ""
    },
    food: {
      type: String,
      required: true,
      trim: true
    },
    guestCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    isGuest: {
      type: Boolean,
      default: false
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

rsvpSchema.index(
  { eventId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: "objectId" },
      cancelledAt: null
    }
  }
);

export const RSVP = mongoose.models.RSVP || mongoose.model("RSVP", rsvpSchema);
