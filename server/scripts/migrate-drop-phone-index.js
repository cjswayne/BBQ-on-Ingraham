/**
 * One-time migration: drop the stale `phone_1` unique index from the `users` collection.
 *
 * This index was left over from a previous schema version where `phone` was a unique field.
 * Because it is not sparse, MongoDB enforces uniqueness on null values, which blocks any
 * second user document without a phone field from being inserted (E11000).
 *
 * Usage:
 *   node server/scripts/migrate-drop-phone-index.js [--dry-run] [--test]
 */

import "dotenv/config";
import mongoose from "mongoose";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isTest = args.includes("--test");

const TARGET_COLLECTION = "users";
const TARGET_INDEX = "phone_1";

const connectDb = async () => {
  // Accept either MONGODB_URI (production/Render) or MONGO_URI (local dev alias)
  const uri = isTest
    ? "mongodb://localhost:27017/bbq-test"
    : process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    throw new Error("Neither MONGODB_URI nor MONGO_URI environment variable is set");
  }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${uri.replace(/\/\/.*@/, "//***@")}`);
};

const getExistingIndexNames = async (db) => {
  const indexes = await db.collection(TARGET_COLLECTION).indexes();
  return indexes.map((idx) => idx.name);
};

const run = async () => {
  try {
    await connectDb();
    const db = mongoose.connection.db;

    const existingIndexNames = await getExistingIndexNames(db);
    console.log(`Existing indexes on '${TARGET_COLLECTION}':`, existingIndexNames);

    if (!existingIndexNames.includes(TARGET_INDEX)) {
      console.log(`Index '${TARGET_INDEX}' not found — nothing to do.`);
      return;
    }

    if (isDryRun) {
      console.log(
        `[DRY RUN] Would drop index '${TARGET_INDEX}' from '${TARGET_COLLECTION}'.`
      );
      return;
    }

    console.log(`Dropping index '${TARGET_INDEX}' from '${TARGET_COLLECTION}'...`);
    await db.collection(TARGET_COLLECTION).dropIndex(TARGET_INDEX);
    console.log(`Successfully dropped index '${TARGET_INDEX}'.`);

    const updatedIndexNames = await getExistingIndexNames(db);
    console.log(`Remaining indexes on '${TARGET_COLLECTION}':`, updatedIndexNames);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

run();
