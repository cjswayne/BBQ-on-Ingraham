import { Router } from "express";
import { z } from "zod";

import { requireAdmin } from "../middleware/adminAuth.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { Event } from "../models/Event.js";
import { RSVP } from "../models/RSVP.js";
import { ThemePollOption } from "../models/ThemePollOption.js";
import { createHttpError } from "../middleware/errorHandler.js";
import { getNextMonday } from "../utils/dateUtils.js";
import { logger } from "../utils/logger.js";

const router = Router();

const themeSchema = z.object({
  body: z.object({
    theme: z.string().trim().min(1, "Theme is required")
  }),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

const suggestionSchema = z.object({
  body: z.object({
    suggestion: z.string().trim().min(1, "Suggestion is required")
  }),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

const voteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().trim().min(1),
    optionId: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

const getOrCreateNextEvent = async () => {
  const eventDate = getNextMonday();

  return Event.findOneAndUpdate(
    { date: eventDate },
    { $setOnInsert: { date: eventDate, themePollActive: true } },
    { returnDocument: "after", upsert: true }
  );
};

const serializeEventPayload = async (event) => {
  const [rsvps, pollOptions] = await Promise.all([
    RSVP.find({ eventId: event._id, cancelledAt: null })
      .populate("userId", "name phone profilePhotoUrl")
      .sort({ createdAt: 1 }),
    ThemePollOption.find({ eventId: event._id }).sort({ createdAt: 1 })
  ]);

  return {
    event: {
      id: event._id.toString(),
      date: event.date,
      theme: event.theme,
      themePollActive: event.themePollActive
    },
    rsvps: rsvps.map((rsvp) => ({
      id: rsvp._id.toString(),
      attendeeName: rsvp.userId?.name || rsvp.guestName,
      phone: rsvp.userId?.phone || "",
      profilePhotoUrl: rsvp.userId?.profilePhotoUrl || "",
      food: rsvp.food,
      guestCount: rsvp.guestCount,
      isGuest: rsvp.isGuest
    })),
    pollOptions: pollOptions.map((option) => ({
      id: option._id.toString(),
      suggestion: option.suggestion,
      voteCount: option.votes.length,
      votes: option.votes.map((voteId) => voteId.toString())
    }))
  };
};

router.get("/next", async (_request, response, next) => {
  try {
    const event = await getOrCreateNextEvent();
    const payload = await serializeEventPayload(event);

    response.status(200).json(payload);
  } catch (error) {
    logger.error("Failed to fetch next event", error);
    next(error);
  }
});

router.put(
  "/:id/theme",
  requireAuth,
  requireAdmin,
  validateRequest(themeSchema),
  async (request, response, next) => {
    try {
      const event = await Event.findByIdAndUpdate(
        request.params.id,
        {
          theme: request.body.theme,
          themePollActive: false
        },
        { returnDocument: "after" }
      );

      if (!event) {
        next(createHttpError(404, "Event not found"));
        return;
      }

      response.status(200).json({
        event: {
          id: event._id.toString(),
          date: event.date,
          theme: event.theme,
          themePollActive: event.themePollActive
        }
      });
    } catch (error) {
      logger.error("Failed to update event theme", error);
      next(error);
    }
  }
);

router.post(
  "/:id/poll",
  requireAuth,
  validateRequest(suggestionSchema),
  async (request, response, next) => {
    try {
      const event = await Event.findById(request.params.id);

      if (!event) {
        next(createHttpError(404, "Event not found"));
        return;
      }

      const option = await ThemePollOption.create({
        eventId: event._id,
        suggestion: request.body.suggestion,
        createdBy: request.user.userId
      });

      response.status(201).json({
        option: {
          id: option._id.toString(),
          suggestion: option.suggestion,
          voteCount: option.votes.length
        }
      });
    } catch (error) {
      logger.error("Failed to add poll suggestion", error);
      next(error);
    }
  }
);

router.post(
  "/:id/poll/:optionId/vote",
  requireAuth,
  validateRequest(voteSchema),
  async (request, response, next) => {
    try {
      const option = await ThemePollOption.findOne({
        _id: request.params.optionId,
        eventId: request.params.id
      });

      if (!option) {
        next(createHttpError(404, "Poll option not found"));
        return;
      }

      const userId = request.user.userId;
      const existingVoteIndex = option.votes.findIndex(
        (voteId) => voteId.toString() === userId
      );

      if (existingVoteIndex >= 0) {
        option.votes.splice(existingVoteIndex, 1);
      } else {
        option.votes.push(userId);
      }

      await option.save();

      response.status(200).json({
        option: {
          id: option._id.toString(),
          voteCount: option.votes.length,
          voted: existingVoteIndex < 0
        }
      });
    } catch (error) {
      logger.error("Failed to toggle poll vote", error);
      next(error);
    }
  }
);

export { getOrCreateNextEvent, serializeEventPayload };
export default router;
