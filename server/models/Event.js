import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
      index: true
    },
    theme: {
      type: String,
      trim: true,
      default: ""
    },
    themePollActive: {
      type: Boolean,
      default: true
    },
    cancelled: {
      type: Boolean,
      default: false
    },
    // Set only for one-off events with their own page (e.g. "thanksgiving")
    slug: {
      type: String,
      trim: true,
      default: undefined
    },
    title: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

eventSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { slug: { $type: "string" } } }
);

export const Event =
  mongoose.models.Event || mongoose.model("Event", eventSchema);
