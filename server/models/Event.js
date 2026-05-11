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
    }
  },
  {
    timestamps: true
  }
);

export const Event =
  mongoose.models.Event || mongoose.model("Event", eventSchema);
