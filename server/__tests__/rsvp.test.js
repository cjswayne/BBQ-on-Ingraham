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
      email: "alex@example.com",
      name: "Alex"
    });
    const token = createJwtToken({
      userId: user._id.toString(),
      email: user.email
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

  it("auto-creates a user and returns a token when email is supplied without auth", async () => {
    const response = await request(app).post("/api/rsvps").send({
      eventDate: "2026-04-20",
      name: "Taylor",
      email: "taylor@example.com",
      food: "Potato salad",
      guestCount: 1
    });

    expect(response.status).toBe(201);
    expect(response.body.rsvp.isGuest).toBe(false);
    expect(response.body.token).toBeTruthy();

    // Confirm the user record was created with the correct email and name
    const user = await User.findOne({ email: "taylor@example.com" });
    expect(user).not.toBeNull();
    expect(user.name).toBe("Taylor");
  });

  it("blocks new RSVPs once the 20 person cap is reached", async () => {
    const fillResponse = await request(app).post("/api/rsvps").send({
      eventDate: "2026-04-20",
      name: "Big Group",
      guestCount: 19
    });
    expect(fillResponse.status).toBe(201);

    const lastSpot = await request(app).post("/api/rsvps").send({
      eventDate: "2026-04-20",
      name: "Last Spot",
      guestCount: 1
    });
    expect(lastSpot.status).toBe(201);

    const overCap = await request(app).post("/api/rsvps").send({
      eventDate: "2026-04-20",
      name: "Too Late",
      guestCount: 1
    });
    expect(overCap.status).toBe(409);
    expect(overCap.body.error).toMatch(/full/);
  });

  it("lets an existing attendee re-RSVP without counting them twice", async () => {
    await request(app).post("/api/rsvps").send({
      eventDate: "2026-04-20",
      name: "Big Group",
      guestCount: 18
    });

    const user = await User.create({ email: "sam@example.com", name: "Sam" });
    const token = createJwtToken({ userId: user._id.toString(), email: user.email });
    const send = (guestCount) =>
      request(app)
        .post("/api/rsvps")
        .set("Authorization", `Bearer ${token}`)
        .send({ eventDate: "2026-04-20", name: "Sam", guestCount });

    expect((await send(2)).status).toBe(201);
    expect((await send(2)).status).toBe(201);
    expect((await send(3)).status).toBe(409);
  });

  it("blocks an RSVP edit that would push the head count over the cap", async () => {
    await request(app).post("/api/rsvps").send({
      eventDate: "2026-04-20",
      name: "Big Group",
      guestCount: 18
    });

    const user = await User.create({ email: "kim@example.com", name: "Kim" });
    const token = createJwtToken({ userId: user._id.toString(), email: user.email });
    const created = await request(app)
      .post("/api/rsvps")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventDate: "2026-04-20", name: "Kim", guestCount: 1 });

    const okEdit = await request(app)
      .put(`/api/rsvps/${created.body.rsvp.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ food: "Corn", guestCount: 2 });
    expect(okEdit.status).toBe(200);

    const overEdit = await request(app)
      .put(`/api/rsvps/${created.body.rsvp.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ food: "Corn", guestCount: 3 });
    expect(overEdit.status).toBe(409);
  });
});
