import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      trim: true,
      default: ""
    },
    profilePhotoUrl: {
      type: String,
      trim: true,
      default: ""
    },
    passwordHash: {
      type: String,
      default: ""
    },
    passwordResetToken: {
      type: String,
      default: ""
    },
    passwordResetExpires: {
      type: Date,
      default: null
    },
    isNeighbor: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
