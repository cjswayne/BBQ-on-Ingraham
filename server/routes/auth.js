import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { z } from "zod";

import { createJwtToken, requireAuth } from "../middleware/auth.js";
import { createHttpError } from "../middleware/errorHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { emailService } from "../services/emailService.js";
import { logger } from "../utils/logger.js";

const router = Router();
const jwtSecret = process.env.JWT_SECRET || "development-secret";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

const registerSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().regex(phoneRegex, "Invalid phone number").optional(),
      name: z.string().trim().min(1)
    })
    .refine((data) => data.email || data.phone, {
      message: "Either email or phone is required"
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().regex(phoneRegex, "Invalid phone number").optional(),
      password: z.string().min(8)
    })
    .refine((data) => data.email || data.phone, {
      message: "Either email or phone is required"
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const setPasswordSchema = z
  .object({
    body: z.object({
      token: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().regex(phoneRegex, "Invalid phone number").optional(),
      password: z.string().min(8),
      confirmPassword: z.string().min(8)
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional()
  })
  .superRefine(({ body }, context) => {
    if (body.password !== body.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["body", "confirmPassword"],
        message: "Passwords do not match"
      });
    }

    if (!body.token && !body.email && !body.phone) {
      context.addIssue({
        code: "custom",
        path: ["body"],
        message: "Either token, email, or phone is required"
      });
    }
  });

const lookupSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional()
    })
    .refine((data) => data.email || data.phone, {
      message: "Either email or phone is required"
    })
});

const profileSchema = z.object({
  body: z.object({
    password: z.string().min(8),
    name: z.string().trim().optional(),
    profilePhotoUrl: z.string().url().optional(),
    isNeighbor: z.boolean().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const profileSetupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    profilePhotoUrl: z.string().url().optional().or(z.literal("")),
    isNeighbor: z.boolean().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

/**
 * Creates a standard IP-based route limiter.
 * @param {number} limit - Maximum requests per ten minute window.
 * @param {string} message - Error message returned when rate limit is exceeded.
 * @returns {import("express").RequestHandler} Express middleware handler.
 */
const createRateLimiter = (limit, message) => {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: true,
    handler: (request, response) => {
      response.status(429).json({ error: message });
    }
  });
};

const registerRateLimiter = createRateLimiter(5, "Too many registration attempts");
const loginRateLimiter = createRateLimiter(10, "Too many login attempts");
const setPasswordRateLimiter = createRateLimiter(5, "Too many password set attempts");
const lookupRateLimiter = createRateLimiter(20, "Too many lookup attempts");

/**
 * Serializes user values for auth responses.
 * @param {import("mongoose").Document} user - User document.
 * @returns {{id: string, email: string|null, phone: string|null, name: string, profilePhotoUrl: string, isNeighbor: boolean}} Serialized user payload.
 */
const serializeUser = (user) => {
  return {
    id: user._id.toString(),
    email: user.email || null,
    phone: user.phone || null,
    name: user.name,
    profilePhotoUrl: user.profilePhotoUrl,
    isNeighbor: user.isNeighbor
  };
};

/**
 * Creates a one-hour password set token.
 * @param {string} userId - User id for token payload.
 * @returns {string} Signed password setup token.
 */
const createPasswordSetToken = (userId) => {
  return jwt.sign({ userId, purpose: "set-password" }, jwtSecret, { expiresIn: "1h" });
};

router.post(
  "/register",
  registerRateLimiter,
  validateRequest(registerSchema),
  async (request, response, next) => {
    try {
      const { email, phone, name } = request.body;
      const normalizedEmail = email ? email.trim().toLowerCase() : null;
      const normalizedPhone = phone ? phone.trim() : null;

      // Build query: find by email or phone (whichever is provided)
      const findQuery = normalizedEmail ? { email: normalizedEmail } : { phone: normalizedPhone };
      const setOnInsert = { name };
      if (normalizedEmail) setOnInsert.email = normalizedEmail;
      if (normalizedPhone) setOnInsert.phone = normalizedPhone;

      const user = await User.findOneAndUpdate(
        findQuery,
        { $setOnInsert: setOnInsert },
        { returnDocument: "after", upsert: true }
      );

      // Backfill phone on existing email-only user (or vice versa)
      if (normalizedPhone && !user.phone) user.phone = normalizedPhone;
      if (normalizedEmail && !user.email) user.email = normalizedEmail;
      await user.save();

      const token = createJwtToken({
        userId: user._id.toString(),
        email: user.email || undefined,
        phone: user.phone || undefined
      });
      const passwordSetToken = createPasswordSetToken(user._id.toString());

      if (user.email) {
        await emailService.sendPasswordSetEmail(user.email, passwordSetToken, clientOrigin);
      }

      response.status(200).json({
        token,
        user: serializeUser(user)
      });
    } catch (error) {
      logger.error("Failed to register user", error);
      next(error);
    }
  }
);

router.post(
  "/login",
  loginRateLimiter,
  validateRequest(loginSchema),
  async (request, response, next) => {
    try {
      const { email, phone, password } = request.body;

      // Find user by whichever identifier was provided
      const findQuery = email
        ? { email: email.trim().toLowerCase() }
        : { phone: phone.trim() };
      const user = await User.findOne(findQuery);

      if (!user || !user.passwordHash) {
        next(createHttpError(401, "Invalid credentials"));
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        next(createHttpError(401, "Invalid credentials"));
        return;
      }

      const token = createJwtToken({
        userId: user._id.toString(),
        email: user.email || undefined,
        phone: user.phone || undefined
      });

      response.status(200).json({
        token,
        user: serializeUser(user)
      });
    } catch (error) {
      logger.error("Failed to login user", error);
      next(error);
    }
  }
);

router.post(
  "/set-password",
  setPasswordRateLimiter,
  validateRequest(setPasswordSchema),
  async (request, response, next) => {
    try {
      const { token, email, password } = request.body;
      let user = null;

      if (token) {
        let decodedToken = null;
        try {
          decodedToken = jwt.verify(token, jwtSecret);
        } catch (error) {
          logger.error("Invalid password set token", error);
          next(createHttpError(401, "Invalid or expired password set token"));
          return;
        }

        if (decodedToken.purpose !== "set-password") {
          next(createHttpError(401, "Invalid password set token"));
          return;
        }

        user = await User.findById(decodedToken.userId);
      } else if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        user = await User.findOne({ email: normalizedEmail });

        if (user?.passwordHash) {
          next(createHttpError(400, "Password already set, use login"));
          return;
        }
      } else if (request.body.phone) {
        const normalizedPhone = request.body.phone.trim();
        user = await User.findOne({ phone: normalizedPhone });

        if (user?.passwordHash) {
          next(createHttpError(400, "Password already set, use login"));
          return;
        }
      }

      if (!user) {
        next(createHttpError(404, "User not found"));
        return;
      }

      user.passwordHash = await bcrypt.hash(password, 12);
      await user.save();

      response.status(200).json({ success: true });
    } catch (error) {
      logger.error("Failed to set password", error);
      next(error);
    }
  }
);

router.get("/lookup", lookupRateLimiter, validateRequest(lookupSchema), async (request, response, next) => {
  try {
    const { email, phone } = request.validated.query;
    const findQuery = email
      ? { email: email.trim().toLowerCase() }
      : { phone: phone.trim() };
    const user = await User.findOne(findQuery);

    if (!user) {
      response.status(200).json({ exists: false });
      return;
    }

    response.status(200).json({
      exists: true,
      name: user.name,
      profilePhotoUrl: user.profilePhotoUrl,
      isNeighbor: user.isNeighbor
    });
  } catch (error) {
    logger.error("Failed to lookup user", error);
    next(error);
  }
});

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.user.userId);

    if (!user) {
      next(createHttpError(404, "User not found"));
      return;
    }

    response.status(200).json({
      user: serializeUser(user)
    });
  } catch (error) {
    logger.error("Failed to fetch current user", error);
    next(error);
  }
});

router.put(
  "/profile",
  requireAuth,
  validateRequest(profileSchema),
  async (request, response, next) => {
    try {
      const user = await User.findById(request.user.userId);
      if (!user) {
        next(createHttpError(404, "User not found"));
        return;
      }

      if (!user.passwordHash) {
        next(createHttpError(401, "Password not set"));
        return;
      }

      const isPasswordValid = await bcrypt.compare(request.body.password, user.passwordHash);
      if (!isPasswordValid) {
        next(createHttpError(401, "Invalid password"));
        return;
      }

      if (typeof request.body.name === "string") {
        user.name = request.body.name;
      }
      if (typeof request.body.profilePhotoUrl === "string") {
        user.profilePhotoUrl = request.body.profilePhotoUrl;
      }
      if (typeof request.body.isNeighbor === "boolean") {
        user.isNeighbor = request.body.isNeighbor;
      }

      await user.save();

      response.status(200).json({
        user: serializeUser(user)
      });
    } catch (error) {
      logger.error("Failed to update profile", error);
      next(error);
    }
  }
);

router.put(
  "/profile-setup",
  requireAuth,
  validateRequest(profileSetupSchema),
  async (request, response, next) => {
    try {
      const user = await User.findById(request.user.userId);

      if (!user) {
        next(createHttpError(404, "User not found"));
        return;
      }

      if (typeof request.body.name === "string") {
        user.name = request.body.name;
      }
      if (typeof request.body.profilePhotoUrl === "string") {
        user.profilePhotoUrl = request.body.profilePhotoUrl;
      }
      if (typeof request.body.isNeighbor === "boolean") {
        user.isNeighbor = request.body.isNeighbor;
      }

      await user.save();

      response.status(200).json({
        user: serializeUser(user)
      });
    } catch (error) {
      logger.error("Failed to complete profile setup", error);
      next(error);
    }
  }
);

export default router;
