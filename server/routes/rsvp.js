import { Router } from "express";
import { z } from "zod";

import { createJwtToken, optionalAuth, requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { AppSettings } from "../models/AppSettings.js";
import { Event } from "../models/Event.js";
import { RSVP } from "../models/RSVP.js";
import { User } from "../models/User.js";
import { createHttpError } from "../middleware/errorHandler.js";
import {
  getNextMonday,
  getPacificMidnightUtcDate
} from "../utils/dateUtils.js";
import { logger } from "../utils/logger.js";
import { emailService } from "../services/emailService.js";

const router = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

const createRsvpSchema = z.object({
  body: z.object({
    eventDate: z.string().trim().regex(dateRegex).optional(),
    name: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(phoneRegex, "Invalid phone number").optional(),
    food: z.string().trim().optional().default(""),
    allergies: z.string().trim().optional().default(""),
    guestCount: z.coerce.number().int().min(1),
    profilePhotoUrl: z.string().trim().url().optional().or(z.literal("")),
    isNeighbor: z.boolean().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const updateRsvpSchema = z.object({
  body: z.object({
    food: z.string().trim().optional().default(""),
    allergies: z.string().trim().optional().default(""),
    guestCount: z.coerce.number().int().min(1)
  }),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

const deleteRsvpSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

const parseSelectedEventDate = (eventDateValue) => {
  if (!eventDateValue) {
    return getNextMonday();
  }

  const [year, month, day] = eventDateValue.split("-").map(Number);
  const utcSeedDate = new Date(Date.UTC(year, month - 1, day));

  if (utcSeedDate.getUTCDay() !== 1) {
    throw createHttpError(400, "Event date must be a Monday");
  }

  return getPacificMidnightUtcDate(year, month, day);
};

const getOrCreateEvent = async (eventDate) => {
  return Event.findOneAndUpdate(
    { date: eventDate },
    { $setOnInsert: { date: eventDate, themePollActive: true } },
    { returnDocument: "after", upsert: true }
  );
};

const getEventDateLabel = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
};

const getNotificationSettings = async () => {
  const settings = await AppSettings.findOneAndUpdate(
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

  return settings;
};

router.post(
  "/",
  optionalAuth,
  validateRequest(createRsvpSchema),
  async (request, response, next) => {
    try {
      const eventDate = parseSelectedEventDate(request.body.eventDate);
      const event = await getOrCreateEvent(eventDate);

      if (event.cancelled) {
        next(createHttpError(400, "This event has been cancelled"));
        return;
      }

      let isGuest = !request.user;
      const profilePhotoUrl = request.body.profilePhotoUrl || "";
      let attendeeName = request.body.name || "";
      let rsvp = null;
      let user = null;
      let token = null;

      const normalizedEmail = request.body.email ? request.body.email.trim().toLowerCase() : null;
      const normalizedPhone = request.body.phone ? request.body.phone.trim() : null;
      const hasIdentifier = normalizedEmail || normalizedPhone;

      if (!request.user && hasIdentifier) {
        // Build upsert query from whichever identifier is provided
        const findQuery = normalizedEmail
          ? { email: normalizedEmail }
          : { phone: normalizedPhone };
        const setOnInsert = { name: request.body.name || "" };
        if (normalizedEmail) setOnInsert.email = normalizedEmail;
        if (normalizedPhone) setOnInsert.phone = normalizedPhone;

        user = await User.findOneAndUpdate(
          findQuery,
          { $setOnInsert: setOnInsert },
          { upsert: true, returnDocument: "after" }
        );

        if (request.body.name && user.name !== request.body.name) {
          user.name = request.body.name;
        }

        // Backfill phone/email on existing users
        if (normalizedPhone && !user.phone) user.phone = normalizedPhone;
        if (normalizedEmail && !user.email) user.email = normalizedEmail;

        if (request.body.profilePhotoUrl) {
          user.profilePhotoUrl = request.body.profilePhotoUrl;
        }

        if (typeof request.body.isNeighbor === "boolean") {
          user.isNeighbor = request.body.isNeighbor;
        }

        await user.save();

        token = createJwtToken({
          userId: user._id.toString(),
          email: user.email || undefined,
          phone: user.phone || undefined
        });
        isGuest = false;
        request.user = {
          userId: user._id.toString(),
          email: user.email || null,
          phone: user.phone || null
        };
      }

      if (isGuest && !attendeeName) {
        next(createHttpError(400, "Guest name is required"));
        return;
      }

      if (!isGuest) {
        if (!user) {
          user = await User.findById(request.user.userId);
        }

        if (!user) {
          next(createHttpError(404, "User not found"));
          return;
        }

        attendeeName = attendeeName || user.name || "Resident";

        user.name = attendeeName;

        if (profilePhotoUrl) {
          user.profilePhotoUrl = profilePhotoUrl;
        }

        await user.save();

        rsvp = await RSVP.findOneAndUpdate(
          {
            eventId: event._id,
            userId: user._id,
            cancelledAt: null
          },
          {
            eventId: event._id,
            userId: user._id,
            guestName: "",
            food: request.body.food,
            allergies: request.body.allergies || "",
            guestCount: request.body.guestCount,
            isGuest: false,
            cancelledAt: null
          },
          {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true
          }
        );
      } else {
        rsvp = await RSVP.create({
          eventId: event._id,
          guestName: attendeeName,
          food: request.body.food,
          allergies: request.body.allergies || "",
          guestCount: request.body.guestCount,
          isGuest: true
        });
      }

      const settings = await getNotificationSettings();

      if (settings.emailNotificationsEnabled && settings.notificationEmails.length) {
        try {
          await emailService.sendRSVPNotification(
            {
              attendeeName,
              email: user?.email || user?.phone || "Guest RSVP",
              food: request.body.food,
              guestCount: request.body.guestCount,
              eventDateLabel: getEventDateLabel(event.date),
              profilePhotoUrl: user?.profilePhotoUrl || profilePhotoUrl,
              isGuest
            },
            settings.notificationEmails
          );
        } catch (error) {
          logger.error("RSVP email notification failed", error);
        }
      }

      response.status(201).json({
        rsvp: {
          id: rsvp._id.toString(),
          eventId: event._id.toString(),
          attendeeName,
          food: rsvp.food,
          allergies: rsvp.allergies || "",
          guestCount: rsvp.guestCount,
          isGuest: rsvp.isGuest,
          profilePhotoUrl: user?.profilePhotoUrl || profilePhotoUrl
        },
        ...(token ? { token } : {})
      });
    } catch (error) {
      logger.error("Failed to create RSVP", error);
      next(error);
    }
  }
);

router.get("/mine", requireAuth, async (request, response, next) => {
  try {
    const rsvps = await RSVP.find({ userId: request.user.userId })
      .sort({ createdAt: -1 })
      .populate("eventId", "date theme cancelled");

    response.status(200).json({
      rsvps: rsvps.map((rsvp) => ({
        id: rsvp._id.toString(),
        eventDate: rsvp.eventId?.date,
        eventTheme: rsvp.eventId?.theme,
        food: rsvp.food,
        allergies: rsvp.allergies || "",
        guestCount: rsvp.guestCount,
        cancelledAt: rsvp.cancelledAt,
        createdAt: rsvp.createdAt
      }))
    });
  } catch (error) {
    logger.error("Failed to fetch user RSVPs", error);
    next(error);
  }
});

router.put(
  "/:id",
  requireAuth,
  validateRequest(updateRsvpSchema),
  async (request, response, next) => {
    try {
      const rsvp = await RSVP.findOneAndUpdate(
        {
          _id: request.params.id,
          userId: request.user.userId,
          cancelledAt: null
        },
        {
          food: request.body.food,
          allergies: request.body.allergies,
          guestCount: request.body.guestCount
        },
        { returnDocument: "after" }
      );

      if (!rsvp) {
        next(createHttpError(404, "RSVP not found"));
        return;
      }

      response.status(200).json({
        rsvp: {
          id: rsvp._id.toString(),
          food: rsvp.food,
          allergies: rsvp.allergies || "",
          guestCount: rsvp.guestCount
        }
      });
    } catch (error) {
      logger.error("Failed to update RSVP", error);
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  validateRequest(deleteRsvpSchema),
  async (request, response, next) => {
    try {
      const rsvp = await RSVP.findOneAndUpdate(
        {
          _id: request.params.id,
          userId: request.user.userId,
          cancelledAt: null
        },
        {
          cancelledAt: new Date()
        },
        { returnDocument: "after" }
      );

      if (!rsvp) {
        next(createHttpError(404, "RSVP not found"));
        return;
      }

      response.status(200).json({
        rsvp: {
          id: rsvp._id.toString(),
          cancelledAt: rsvp.cancelledAt
        }
      });
    } catch (error) {
      logger.error("Failed to cancel RSVP", error);
      next(error);
    }
  }
);

export default router;
