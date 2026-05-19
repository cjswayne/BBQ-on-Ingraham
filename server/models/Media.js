import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    cloudinaryUrl: {
      type: String,
      required: true,
      trim: true
    },
    publicId: {
      type: String,
      required: true,
      trim: true
    },
    mediaType: {
      type: String,
      enum: ["photo", "video"],
      required: true
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

mediaSchema.index({ createdAt: -1 });

export const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);
