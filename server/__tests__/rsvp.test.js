import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "24h";
process.env.EMAIL_NOTIFICATIONS_ENABLED = "false";

vi.mock("../services/emailService.js", () => {
  return {
    emailService: {
      sendRSVPNotification: vi.fn()
    }
  };
});

const { errorHandler } = await import("../middleware/errorHandler.js");
const rsvpRouter = (await import("../routes/rsvp.js")).default;
const { createJwtToken } = await import("../middleware/auth.js");
const { RSVP } = await import("../models/RSVP.js");
const { User } = await import("../models/User.js");

const buildTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use("/api/rsvps", rsvpRouter);
  app.use(errorHandler);

  return app;
};

describe("rsvp routes", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = buildTestApp();
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("creates a guest RSVP without authentication", async () => {
    const response = await request(app).post("/api/rsvps").send({
      eventDate: "2026-04-20",
      name: "Jamie",
      food: "Chips and salsa",
      guestCount: 2
    });

    expect(response.status).toBe(201);
    expect(response.body.rsvp.attendeeName).toBe("Jamie");
    expect(response.body.rsvp.isGuest).toBe(true);
  });

  it("creates and cancels an authenticated RSVP", async () => {
    const user = await User.create({
      phone: "+16195550111",
      name: "Alex"
    });
    const token = createJwtToken({
      userId: user._id.toString(),
      phone: user.phone
    });

    const createResponse = await request(app)
      .post("/api/rsvps")
      .set("Authorization", `Bearer ${token}`)
      .send({
        eventDate: "2026-04-20",
        name: "Alex",
        food: "Burgers",
        guestCount: 3,
        profilePhotoUrl: "https://example.com/photo.jpg"
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.rsvp.isGuest).toBe(false);

    const savedRsvp = await RSVP.findById(createResponse.body.rsvp.id);
    expect(savedRsvp).not.toBeNull();

    const cancelResponse = await request(app)
      .delete(`/api/rsvps/${createResponse.body.rsvp.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.rsvp.cancelledAt).toBeTruthy();
  });
});
