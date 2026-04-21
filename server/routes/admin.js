import { Router } from "express";
import { z } from "zod";

import { requireAdmin } from "../middleware/adminAuth.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { AppSettings } from "../models/AppSettings.js";
import { RSVP } from "../models/RSVP.js";
import { getOrCreateNextEvent } from "./events.js";
import { createHttpError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = Router();

const settingsSchema = z.object({
  body: z.object({
    emailNotificationsEnabled: z.boolean(),
    notificationEmails: z.array(z.string().trim().email()).min(1)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const getOrCreateSettings = async () => {
  return AppSettings.findOneAndUpdate(
    { key: "global" },
    {
      $setOnInsert: {
        key: "global",
        emailNotificationsEnabled:
          String(process.env.EMAIL_NOTIFICATIONS_ENABLED || "true") === "true",
        notificationEmails: String(process.env.ADMIN_NOTIFICATION_EMAILS || "")
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean)
      }
    },
    { returnDocument: "after", upsert: true }
  );
};

router.get("/stats", requireAuth, requireAdmin, async (_request, response, next) => {
  try {
    const [event, settings] = await Promise.all([
      getOrCreateNextEvent(),
      getOrCreateSettings()
    ]);
    const rsvps = await RSVP.find({
      eventId: event._id,
      cancelledAt: null
    })
      .populate("userId", "name phone profilePhotoUrl")
      .sort({ createdAt: 1 });

    const attendeeCount = rsvps.reduce((total, rsvp) => total + rsvp.guestCount, 0);
    const foodSummary = rsvps.reduce((accumulator, rsvp) => {
      const key = rsvp.food;
      const currentCount = accumulator[key] || 0;

      accumulator[key] = currentCount + 1;
      return accumulator;
    }, {});

    response.status(200).json({
      stats: {
        eventId: event._id.toString(),
        attendeeCount,
        rsvpCount: rsvps.length,
        eventDate: event.date,
        theme: event.theme,
        foodSummary,
        rsvps: rsvps.map((rsvp) => ({
          id: rsvp._id.toString(),
          attendeeName: rsvp.userId?.name || rsvp.guestName,
          phone: rsvp.userId?.phone || "",
          food: rsvp.food,
          guestCount: rsvp.guestCount,
          profilePhotoUrl: rsvp.userId?.profilePhotoUrl || "",
          isGuest: rsvp.isGuest
        }))
      },
      settings: {
        emailNotificationsEnabled: settings.emailNotificationsEnabled,
        notificationEmails: settings.notificationEmails
      }
    });
  } catch (error) {
    logger.error("Failed to fetch admin stats", error);
    next(error);
  }
});

router.put(
  "/settings",
  requireAuth,
  requireAdmin,
  validateRequest(settingsSchema),
  async (request, response, next) => {
    try {
      const settings = await AppSettings.findOneAndUpdate(
        { key: "global" },
        {
          key: "global",
          emailNotificationsEnabled: request.body.emailNotificationsEnabled,
          notificationEmails: request.body.notificationEmails
        },
        {
          returnDocument: "after",
          upsert: true
        }
      );

      if (!settings) {
        next(createHttpError(500, "Unable to save admin settings"));
        return;
      }

      response.status(200).json({
        settings: {
          emailNotificationsEnabled: settings.emailNotificationsEnabled,
          notificationEmails: settings.notificationEmails
        }
      });
    } catch (error) {
      logger.error("Failed to update admin settings", error);
      next(error);
    }
  }
);

export default router;
