import { Router } from "express";
import { z } from "zod";

import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { createHttpError } from "../middleware/errorHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { Media } from "../models/Media.js";
import { User } from "../models/User.js";
import { logger } from "../utils/logger.js";

const router = Router();

const createMediaSchema = z.object({
  body: z.object({
    cloudinaryUrl: z.string().url(),
    publicId: z.string().min(1),
    mediaType: z.enum(["photo", "video"]),
    thumbnailUrl: z.string().url().optional().or(z.literal(""))
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const listMediaSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});

const mediaIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

router.post(
  "/",
  requireAuth,
  validateRequest(createMediaSchema),
  async (request, response, next) => {
    try {
      const media = await Media.create({
        userId: request.user.userId,
        cloudinaryUrl: request.body.cloudinaryUrl,
        publicId: request.body.publicId,
        mediaType: request.body.mediaType,
        thumbnailUrl: request.body.thumbnailUrl || ""
      });

      response.status(201).json({ media });
    } catch (error) {
      logger.error("Failed to create media", error);
      next(error);
    }
  }
);

router.get(
  "/",
  optionalAuth,
  validateRequest(listMediaSchema),
  async (request, response, next) => {
    try {
      const page = request.query.page;
      const limit = request.query.limit;
      const skip = (page - 1) * limit;

      const [media, total] = await Promise.all([
        Media.find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate({ path: "userId", select: "name profilePhotoUrl", model: User }),
        Media.countDocuments({})
      ]);
      const totalPages = Math.ceil(total / limit) || 1;

      response.status(200).json({ media, page, totalPages, total });
    } catch (error) {
      logger.error("Failed to list media", error);
      next(error);
    }
  }
);

router.get("/mine", requireAuth, async (request, response, next) => {
  try {
    const media = await Media.find({ userId: request.user.userId }).sort({
      createdAt: -1
    });

    response.status(200).json({ media });
  } catch (error) {
    logger.error("Failed to list user media", error);
    next(error);
  }
});

router.get(
  "/:id",
  optionalAuth,
  validateRequest(mediaIdSchema),
  async (request, response, next) => {
    try {
      const media = await Media.findById(request.params.id).populate({
        path: "userId",
        select: "name profilePhotoUrl",
        model: User
      });

      if (!media) {
        next(createHttpError(404, "Media not found"));
        return;
      }

      response.status(200).json({ media });
    } catch (error) {
      logger.error("Failed to fetch media", error);
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  validateRequest(mediaIdSchema),
  async (request, response, next) => {
    try {
      const media = await Media.findOne({
        _id: request.params.id,
        userId: request.user.userId
      });

      if (!media) {
        next(createHttpError(404, "Media not found"));
        return;
      }

      await media.deleteOne();

      response.status(200).json({ success: true });
    } catch (error) {
      logger.error("Failed to delete media", error);
      next(error);
    }
  }
);

export default router;
