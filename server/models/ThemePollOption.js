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
    votes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: []
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const ThemePollOption =
  mongoose.models.ThemePollOption ||
  mongoose.model("ThemePollOption", themePollOptionSchema);
