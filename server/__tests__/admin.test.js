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

describe("admin routes", () => {
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

  describe("POST /api/admin/login", () => {
    it("returns 401 when the password is incorrect", async () => {
      process.env.ADMIN_PASSWORD = "correct-admin-pass";

      const response = await request(app)
        .post("/api/admin/login")
        .send({ password: "wrong-pass" });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/Incorrect password/i);
    });

    it("returns a JWT token when the password is correct", async () => {
      process.env.ADMIN_PASSWORD = "correct-admin-pass";

      const response = await request(app)
        .post("/api/admin/login")
        .send({ password: "correct-admin-pass" });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
    });

    it("returns 503 when ADMIN_PASSWORD env var is not configured", async () => {
      delete process.env.ADMIN_PASSWORD;

      const response = await request(app)
        .post("/api/admin/login")
        .send({ password: "any-password" });

      expect(response.status).toBe(503);
    });
  });

  describe("GET /api/admin/stats", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app).get("/api/admin/stats");
      expect(response.status).toBe(401);
    });

    it("returns 403 when a regular user JWT is provided instead of admin token", async () => {
      const user = await User.create({ email: "user@example.com", name: "Regular User" });
      const token = createJwtToken({ userId: user._id.toString(), email: user.email });

      const response = await request(app)
        .get("/api/admin/stats")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/Admin access required/i);
    });

    it("returns stats and settings when a valid admin token is used", async () => {
      process.env.ADMIN_PASSWORD = "correct-admin-pass";

      const loginResponse = await request(app)
        .post("/api/admin/login")
        .send({ password: "correct-admin-pass" });

      const adminToken = loginResponse.body.token;

      const statsResponse = await request(app)
        .get("/api/admin/stats")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.stats).toBeTruthy();
      expect(statsResponse.body.settings.notificationEmails).toContain("planner@example.com");
    });
  });
});
