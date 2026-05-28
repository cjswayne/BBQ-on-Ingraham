import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "24h";

// Prevent real email delivery during tests
vi.mock("../services/emailService.js", () => ({
  emailService: {
    sendPasswordSetEmail: vi.fn().mockResolvedValue(undefined)
  }
}));

const { errorHandler } = await import("../middleware/errorHandler.js");
const authRouter = (await import("../routes/auth.js")).default;
const { User } = await import("../models/User.js");
const { createJwtToken } = await import("../middleware/auth.js");

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
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    app = buildTestApp();
  });

  describe("POST /api/auth/register", () => {
    it("creates a new user by email and returns a JWT and user object", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({ email: "newuser@example.com", name: "New User" });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user.email).toBe("newuser@example.com");
      expect(response.body.user.name).toBe("New User");
      expect(response.body.user.id).toBeTruthy();

      // Verify the user was actually persisted
      const user = await User.findOne({ email: "newuser@example.com" });
      expect(user).not.toBeNull();
    });

    it("upserts an existing user without creating a duplicate record", async () => {
      await request(app)
        .post("/api/auth/register")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({ email: "existing@example.com", name: "Original" });

      const secondResponse = await request(app)
        .post("/api/auth/register")
        .set("X-Forwarded-For", "10.0.0.2")
        .send({ email: "existing@example.com", name: "Duplicate Attempt" });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.user.email).toBe("existing@example.com");

      const count = await User.countDocuments({ email: "existing@example.com" });
      expect(count).toBe(1);
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 401 when user exists but has no password set", async () => {
      await User.create({ email: "nopassword@example.com", name: "No Pass" });

      const response = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({ email: "nopassword@example.com", password: "somepassword" });

      expect(response.status).toBe(401);
    });

    it("returns 401 with a wrong password", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 12);
      await User.create({ email: "user@example.com", name: "Test User", passwordHash });

      const response = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({ email: "user@example.com", password: "wrong-password" });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/Invalid credentials/i);
    });

    it("returns a JWT and full user profile with the correct password", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 12);
      await User.create({
        email: "user@example.com",
        name: "Test User",
        passwordHash,
        isNeighbor: true
      });

      const response = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({ email: "user@example.com", password: "correct-password" });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user.email).toBe("user@example.com");
      expect(response.body.user.name).toBe("Test User");
      expect(response.body.user.isNeighbor).toBe(true);
    });
  });

  describe("POST /api/auth/set-password", () => {
    it("sets password via a valid signed token", async () => {
      const user = await User.create({ email: "tokenuser@example.com", name: "Token User" });
      const setToken = jwt.sign(
        { userId: user._id.toString(), purpose: "set-password" },
        "test-secret",
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .post("/api/auth/set-password")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({ token: setToken, password: "newpassword123", confirmPassword: "newpassword123" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Confirm the hash was written and matches the plain-text password
      const updated = await User.findById(user._id);
      expect(updated.passwordHash).toBeTruthy();
      const isValid = await bcrypt.compare("newpassword123", updated.passwordHash);
      expect(isValid).toBe(true);
    });

    it("sets password via email when the user has no existing password", async () => {
      await User.create({ email: "firsttime@example.com", name: "First Time" });

      const response = await request(app)
        .post("/api/auth/set-password")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({
          email: "firsttime@example.com",
          password: "initialpass",
          confirmPassword: "initialpass"
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("rejects the email path when a password is already set", async () => {
      const passwordHash = await bcrypt.hash("existing-password", 12);
      await User.create({
        email: "alreadyset@example.com",
        name: "Already Set",
        passwordHash
      });

      const response = await request(app)
        .post("/api/auth/set-password")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({
          email: "alreadyset@example.com",
          password: "newpassword",
          confirmPassword: "newpassword"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Password already set/i);
    });
  });

  describe("GET /api/auth/lookup", () => {
    it("returns user info for an existing email", async () => {
      await User.create({ email: "known@example.com", name: "Known User", isNeighbor: true });

      const response = await request(app)
        .get("/api/auth/lookup")
        .query({ email: "known@example.com" });

      expect(response.status).toBe(200);
      expect(response.body.exists).toBe(true);
      expect(response.body.name).toBe("Known User");
      expect(response.body.isNeighbor).toBe(true);
    });

    it("returns {exists: false} for an unknown email", async () => {
      const response = await request(app)
        .get("/api/auth/lookup")
        .query({ email: "unknown@example.com" });

      expect(response.status).toBe(200);
      expect(response.body.exists).toBe(false);
      // name must not leak for unknown users
      expect(response.body.name).toBeUndefined();
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns the authenticated user's profile", async () => {
      const user = await User.create({ email: "me@example.com", name: "Me User" });
      const token = createJwtToken({ userId: user._id.toString(), email: user.email });

      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe("me@example.com");
      expect(response.body.user.name).toBe("Me User");
      expect(response.body.user.id).toBe(user._id.toString());
    });

    it("returns 401 when no auth token is provided", async () => {
      const response = await request(app).get("/api/auth/me");
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/auth/profile", () => {
    it("updates name and photo when the password is correct", async () => {
      const passwordHash = await bcrypt.hash("validpass123", 12);
      const user = await User.create({
        email: "profile@example.com",
        name: "Old Name",
        passwordHash
      });
      const token = createJwtToken({ userId: user._id.toString(), email: user.email });

      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          password: "validpass123",
          name: "New Name",
          profilePhotoUrl: "https://example.com/photo.jpg"
        });

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe("New Name");
      expect(response.body.user.profilePhotoUrl).toBe("https://example.com/photo.jpg");
      expect(response.body.user.email).toBe("profile@example.com");
    });

    it("returns 401 when the supplied password is wrong", async () => {
      const passwordHash = await bcrypt.hash("correct-pass", 12);
      const user = await User.create({
        email: "profile2@example.com",
        name: "Test User",
        passwordHash
      });
      const token = createJwtToken({ userId: user._id.toString(), email: user.email });

      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ password: "wrong-pass", name: "Hacker" });

      expect(response.status).toBe(401);
    });
  });
});
