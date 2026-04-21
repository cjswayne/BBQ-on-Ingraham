import rateLimit from "express-rate-limit";
import { Router } from "express";
import twilio from "twilio";
import { z } from "zod";

import { createJwtToken, requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { createHttpError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = Router();

const phoneRegex = /^\+\d{10,15}$/;
const codeRegex = /^\d{4,8}$/;

const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().trim().regex(phoneRegex, "Phone must be E.164 format")
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().trim().regex(phoneRegex, "Phone must be E.164 format"),
    code: z.string().trim().regex(codeRegex, "Code must be 4 to 8 digits")
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

let twilioClient = null;

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw createHttpError(500, "Twilio is not configured");
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
};

const getVerifyServiceSid = () => {
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!verifyServiceSid) {
    throw createHttpError(500, "Twilio Verify service is not configured");
  }

  return verifyServiceSid;
};

const createRateLimiter = (limit, message) => {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: true,
    handler: (_request, response) => {
      response.status(429).json({ error: message });
    }
  });
};

const sendOtpRateLimiter = createRateLimiter(5, "Too many OTP send attempts");
const verifyOtpRateLimiter = createRateLimiter(10, "Too many OTP verify attempts");

router.post(
  "/send-otp",
  sendOtpRateLimiter,
  validateRequest(sendOtpSchema),
  async (request, response, next) => {
    try {
      const client = getTwilioClient();
      const verifyServiceSid = getVerifyServiceSid();
      const { phone } = request.body;
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({
          to: phone,
          channel: "sms"
        });

      response.status(200).json({
        status: verification.status,
        phone
      });
    } catch (error) {
      logger.error("Failed to send OTP", error);
      next(error);
    }
  }
);

router.post(
  "/verify-otp",
  verifyOtpRateLimiter,
  validateRequest(verifyOtpSchema),
  async (request, response, next) => {
    try {
      const client = getTwilioClient();
      const verifyServiceSid = getVerifyServiceSid();
      const { phone, code } = request.body;
      const verificationCheck = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({
          to: phone,
          code
        });

      if (verificationCheck.status !== "approved") {
        next(createHttpError(401, "Verification code is invalid"));
        return;
      }

      const user = await User.findOneAndUpdate(
        { phone },
        { $setOnInsert: { phone } },
        {
          returnDocument: "after",
          upsert: true
        }
      );

      const token = createJwtToken({
        userId: user._id.toString(),
        phone: user.phone
      });

      response.status(200).json({
        token,
        user: {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name,
          profilePhotoUrl: user.profilePhotoUrl
        }
      });
    } catch (error) {
      logger.error("Failed to verify OTP", error);
      next(error);
    }
  }
);

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.user.userId);

    if (!user) {
      next(createHttpError(404, "User not found"));
      return;
    }

    response.status(200).json({
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        profilePhotoUrl: user.profilePhotoUrl
      }
    });
  } catch (error) {
    logger.error("Failed to fetch current user", error);
    next(error);
  }
});

export default router;
