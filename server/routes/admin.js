import { Router } from "express";
import { z } from "zod";

import { createAdminToken, requireAdminAccess } from "../middleware/adminTokenAuth.js";
import { validateRequest } from "../middleware/validate.js";
import { AppSettings } from "../models/AppSettings.js";
import { Event } from "../models/Event.js";
import { RSVP } from "../models/RSVP.js";
import { ThemePollOption } from "../models/ThemePollOption.js";
import { getOrCreateNextEvent } from "./events.js";
import { createHttpError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv"

try {
  dotenv.config({path:"../.env"});
} catch(_) {}

const router = Router();

const settingsSchema = z.object({
  body: z.object({
    emailNotificationsEnabled: z.boolean(),
    notificationEmails: z.array(z.string().trim().email()).min(1)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const updateRsvpSchema = z.object({
  body: z.object({
    food: z.string().trim().min(1, "Food is required"),
    guestCount: z.coerce.number().int().min(1)
  }),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

const themeSchema = z.object({
  body: z.object({
    theme: z.string().trim().min(1, "Theme is required")
  }),
  params: z.object({
    eventId: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

const cancelledSchema = z.object({
  body: z.object({
    cancelled: z.boolean()
  }),
  params: z.object({
    eventId: z.string().trim().min(1)
  }),
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
 
// Password-based admin login — checks ADMIN_PASSWORD env var, returns short-lived JWT
router.post("/login", (request, response) => {
  const adminPassword = process.env.ADMIN_PASSWORD;

  console.log(adminPassword)

  if (!adminPassword) {
    logger.warn("ADMIN_PASSWORD env var is not set");
    response.status(503).json({ error: "Admin login is not configured" });
    return;
  }

  const { password } = request.body;

  if (!password || password !== adminPassword) {
    logger.warn("Failed admin password login attempt");
    response.status(401).json({ error: "Incorrect password" });
    return;
  }

  const token = createAdminToken();

  response.status(200).json({ token });
});

router.get("/stats", requireAdminAccess, async (_request, response, next) => {
  try {
    const [event, settings] = await Promise.all([
      getOrCreateNextEvent(),
      getOrCreateSettings()
    ]);
    const [rsvps, pollOptions] = await Promise.all([
      RSVP.find({ eventId: event._id, cancelledAt: null })
        .populate("userId", "name email phone profilePhotoUrl")
        .sort({ createdAt: 1 }),
      ThemePollOption.find({ eventId: event._id }).sort({ createdAt: 1 })
    ]);

    const attendeeCount = rsvps.reduce((total, rsvp) => total + rsvp.guestCount, 0);
    const foodSummary = rsvps.reduce((accumulator, rsvp) => {
      const key = rsvp.food;

      accumulator[key] = (accumulator[key] || 0) + 1;
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
          email: rsvp.userId?.email || "",
          food: rsvp.food,
          guestCount: rsvp.guestCount,
          profilePhotoUrl: rsvp.userId?.profilePhotoUrl || "",
          isGuest: rsvp.isGuest
        })),
        pollOptions: pollOptions.map((option) => ({
          id: option._id.toString(),
          suggestion: option.suggestion,
          voteCount: option.voteCount
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
  requireAdminAccess,
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
        { returnDocument: "after", upsert: true }
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

// Cancel any RSVP regardless of owner — admin override
router.delete("/rsvps/:id", requireAdminAccess, async (request, response, next) => {
  try {
    const rsvp = await RSVP.findOneAndUpdate(
      { _id: request.params.id, cancelledAt: null },
      { cancelledAt: new Date() },
      { returnDocument: "after" }
    );

    if (!rsvp) {
      next(createHttpError(404, "RSVP not found"));
      return;
    }

    response.status(200).json({ rsvp: { id: rsvp._id.toString(), cancelledAt: rsvp.cancelledAt } });
  } catch (error) {
    logger.error("Admin failed to cancel RSVP", error);
    next(error);
  }
});

// Update food/guestCount for any RSVP — admin override
router.put(
  "/rsvps/:id",
  requireAdminAccess,
  validateRequest(updateRsvpSchema),
  async (request, response, next) => {
    try {
      const rsvp = await RSVP.findOneAndUpdate(
        { _id: request.params.id, cancelledAt: null },
        { food: request.body.food, guestCount: request.body.guestCount },
        { returnDocument: "after" }
      );

      if (!rsvp) {
        next(createHttpError(404, "RSVP not found"));
        return;
      }

      response.status(200).json({
        rsvp: { id: rsvp._id.toString(), food: rsvp.food, guestCount: rsvp.guestCount }
      });
    } catch (error) {
      logger.error("Admin failed to update RSVP", error);
      next(error);
    }
  }
);

// Delete a poll option
router.delete("/poll-options/:id", requireAdminAccess, async (request, response, next) => {
  try {
    const option = await ThemePollOption.findByIdAndDelete(request.params.id);

    if (!option) {
      next(createHttpError(404, "Poll option not found"));
      return;
    }

    response.status(200).json({ id: option._id.toString() });
  } catch (error) {
    logger.error("Admin failed to delete poll option", error);
    next(error);
  }
});

// Toggle event cancellation — disables RSVPs and shows a cancellation notice
router.put(
  "/events/:eventId/cancelled",
  requireAdminAccess,
  validateRequest(cancelledSchema),
  async (request, response, next) => {
    try {
      const event = await Event.findByIdAndUpdate(
        request.params.eventId,
        { cancelled: request.body.cancelled },
        { returnDocument: "after" }
      );

      if (!event) {
        next(createHttpError(404, "Event not found"));
        return;
      }

      response.status(200).json({
        event: {
          id: event._id.toString(),
          cancelled: event.cancelled
        }
      });
    } catch (error) {
      logger.error("Admin failed to update event cancelled status", error);
      next(error);
    }
  }
);

// Set the event theme — admin override (separate from the events router version)
router.put(
  "/events/:eventId/theme",
  requireAdminAccess,
  validateRequest(themeSchema),
  async (request, response, next) => {
    try {
      const event = await Event.findByIdAndUpdate(
        request.params.eventId,
        { theme: request.body.theme, themePollActive: false },
        { returnDocument: "after" }
      );

      if (!event) {
        next(createHttpError(404, "Event not found"));
        return;
      }

      response.status(200).json({
        event: {
          id: event._id.toString(),
          theme: event.theme,
          themePollActive: event.themePollActive
        }
      });
    } catch (error) {
      logger.error("Admin failed to update event theme", error);
      next(error);
    }
  }
);

export default router;
