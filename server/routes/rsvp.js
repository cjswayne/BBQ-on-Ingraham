import { Router } from "express";
import { z } from "zod";

import { optionalAuth, requireAuth } from "../middleware/auth.js";
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

const createRsvpSchema = z.object({
  body: z.object({
    eventDate: z.string().trim().regex(dateRegex).optional(),
    name: z.string().trim().min(1).optional(),
    food: z.string().trim().min(1, "Food is required"),
    guestCount: z.coerce.number().int().min(1),
    profilePhotoUrl: z.string().trim().url().optional().or(z.literal(""))
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
      const isGuest = !request.user;
      const profilePhotoUrl = request.body.profilePhotoUrl || "";
      let attendeeName = request.body.name || "";
      let rsvp = null;
      let user = null;

      if (isGuest && !attendeeName) {
        next(createHttpError(400, "Guest name is required"));
        return;
      }

      if (!isGuest) {
        user = await User.findById(request.user.userId);

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
              phone: user?.phone || "",
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
          guestCount: rsvp.guestCount,
          isGuest: rsvp.isGuest,
          profilePhotoUrl: user?.profilePhotoUrl || profilePhotoUrl
        }
      });
    } catch (error) {
      logger.error("Failed to create RSVP", error);
      next(error);
    }
  }
);

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
