import mongoose from "mongoose";

import { logger } from "../utils/logger.js";

let connectionPromise = null;

export const connectToDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/barbecue-mondays";

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri).catch((error) => {
      logger.error("MongoDB connection failed", error);
      connectionPromise = null; 
      throw error;
    });
  }

  await connectionPromise;
  logger.info("MongoDB connected");

  return mongoose.connection;
};
