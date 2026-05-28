import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
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

// Unique when present, null values are allowed (sparse)
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
