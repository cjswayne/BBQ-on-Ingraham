import mongoose from "mongoose";

const defaultEmails = String(process.env.ADMIN_NOTIFICATION_EMAILS || "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

const appSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global"
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: String(process.env.EMAIL_NOTIFICATIONS_ENABLED || "true") === "true"
    },
    notificationEmails: {
      type: [String],
      default: defaultEmails
    }
  },
  {
    timestamps: true
  }
);

export const AppSettings =
  mongoose.models.AppSettings ||
  mongoose.model("AppSettings", appSettingsSchema);
