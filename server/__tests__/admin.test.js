import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "24h";
process.env.ADMIN_NOTIFICATION_EMAILS = "planner@example.com";

const { errorHandler } = await import("../middleware/errorHandler.js");
const adminRouter = (await import("../routes/admin.js")).default;
const { createJwtToken } = await import("../middleware/auth.js");
const { User } = await import("../models/User.js");

const buildTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);

  return app;
};

describe("admin auth guard", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(() => {
    app = buildTestApp();
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("blocks authenticated users who are not in ADMIN_PHONES", async () => {
    process.env.ADMIN_PHONES = "+16195559999";

    const user = await User.create({
      phone: "+16195550111",
      name: "Resident"
    });
    const token = createJwtToken({
      userId: user._id.toString(),
      phone: user.phone
    });

    const response = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/Admin access required/i);
  });

  it("allows users whose phone number is in ADMIN_PHONES", async () => {
    process.env.ADMIN_PHONES = "+16195550111";

    const user = await User.create({
      phone: "+16195550111",
      name: "Planner"
    });
    const token = createJwtToken({
      userId: user._id.toString(),
      phone: user.phone
    });

    const response = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.stats).toBeTruthy();
    expect(response.body.settings.notificationEmails).toContain("planner@example.com");
  });
});
