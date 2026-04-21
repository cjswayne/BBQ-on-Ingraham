import mongoose from "mongoose";

const { Schema } = mongoose;

const themePollOptionSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true
    },
    suggestion: {
      type: String,
      required: true,
      trim: true
    },
    voteCount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const ThemePollOption =
  mongoose.models.ThemePollOption ||
  mongoose.model("ThemePollOption", themePollOptionSchema);
