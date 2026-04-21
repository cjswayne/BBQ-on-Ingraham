import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "24h";
process.env.TWILIO_ACCOUNT_SID = "AC_test";
process.env.TWILIO_AUTH_TOKEN = "twilio-token";
process.env.TWILIO_VERIFY_SERVICE_SID = "VA_test";

const mockVerificationsCreate = vi.fn();
const mockVerificationChecksCreate = vi.fn();

vi.mock("twilio", () => {
  return {
    default: vi.fn(() => ({
      verify: {
        v2: {
          services: () => ({
            verifications: {
              create: mockVerificationsCreate
            },
            verificationChecks: {
              create: mockVerificationChecksCreate
            }
          })
        }
      }
    }))
  };
});

const { errorHandler } = await import("../middleware/errorHandler.js");
const authRouter = (await import("../routes/auth.js")).default;
const { User } = await import("../models/User.js");

const buildTestApp = () => {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use("/api/auth", authRouter);
  app.use(errorHandler);

  return app;
};

describe("auth routes", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    mockVerificationsCreate.mockReset();
    mockVerificationChecksCreate.mockReset();
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    app = buildTestApp();
  });

  it("sends an OTP for a valid phone number", async () => {
    mockVerificationsCreate.mockResolvedValue({ status: "pending" });

    const response = await request(app)
      .post("/api/auth/send-otp")
      .set("X-Forwarded-For", "10.10.10.1")
      .send({ phone: "+16195550111" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("pending");
    expect(mockVerificationsCreate).toHaveBeenCalledWith({
      to: "+16195550111",
      channel: "sms"
    });
  });

  it("verifies an OTP and returns a JWT with the user profile", async () => {
    mockVerificationChecksCreate.mockResolvedValue({ status: "approved" });

    const response = await request(app)
      .post("/api/auth/verify-otp")
      .set("X-Forwarded-For", "10.10.10.2")
      .send({ phone: "+16195550111", code: "123456" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.phone).toBe("+16195550111");

    const user = await User.findOne({ phone: "+16195550111" });
    expect(user).not.toBeNull();
  });

  it("rate limits excessive OTP send attempts", async () => {
    mockVerificationsCreate.mockResolvedValue({ status: "pending" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/send-otp")
        .set("X-Forwarded-For", "10.10.10.3")
        .send({ phone: "+16195550111" });

      expect(response.status).toBe(200);
    }

    const throttledResponse = await request(app)
      .post("/api/auth/send-otp")
      .set("X-Forwarded-For", "10.10.10.3")
      .send({ phone: "+16195550111" });

    expect(throttledResponse.status).toBe(429);
    expect(throttledResponse.body.error).toMatch(/Too many OTP send attempts/i);
  });
});
