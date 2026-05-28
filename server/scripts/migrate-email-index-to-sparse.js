/**
 * One-time migration: drop the non-sparse `email_1` unique index and let Mongoose
 * recreate it as a sparse unique index (allows null email for phone-only users).
 *
 * Usage:
 *   node server/scripts/migrate-email-index-to-sparse.js [--dry-run] [--test]
 */

import "dotenv/config";
import mongoose from "mongoose";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isTest = args.includes("--test");

const TARGET_COLLECTION = "users";
const TARGET_INDEX = "email_1";

const connectDb = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    throw new Error("Neither MONGODB_URI nor MONGO_URI environment variable is set");
  }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${uri.replace(/\/\/.*@/, "//***@")}`);
};

const getExistingIndexes = async (db) => {
  return db.collection(TARGET_COLLECTION).indexes();
};

const run = async () => {
  try {
    await connectDb();
    const db = mongoose.connection.db;

    const existingIndexes = await getExistingIndexes(db);
    const existingIndexNames = existingIndexes.map((idx) => idx.name);
    console.log(`Existing indexes on '${TARGET_COLLECTION}':`, existingIndexNames);

    const emailIndex = existingIndexes.find((idx) => idx.name === TARGET_INDEX);

    if (!emailIndex) {
      console.log(`Index '${TARGET_INDEX}' not found — nothing to do.`);
      return;
    }

    if (emailIndex.sparse) {
      console.log(`Index '${TARGET_INDEX}' is already sparse — nothing to do.`);
      return;
    }

    if (isDryRun || isTest) {
      console.log(
        `[DRY RUN] Would drop non-sparse index '${TARGET_INDEX}' from '${TARGET_COLLECTION}'.`
      );
      console.log(
        `[DRY RUN] Mongoose will recreate it as sparse+unique on next startup.`
      );
      return;
    }

    console.log(`Dropping non-sparse index '${TARGET_INDEX}' from '${TARGET_COLLECTION}'...`);
    await db.collection(TARGET_COLLECTION).dropIndex(TARGET_INDEX);
    console.log(`Successfully dropped index '${TARGET_INDEX}'.`);

    console.log(`Creating sparse unique index on 'email'...`);
    await db.collection(TARGET_COLLECTION).createIndex(
      { email: 1 },
      { unique: true, sparse: true }
    );
    console.log(`Successfully created sparse unique email index.`);

    // Also ensure phone sparse index exists
    const phoneIndexExists = existingIndexNames.includes("phone_1");
    if (!phoneIndexExists) {
      console.log(`Creating sparse unique index on 'phone'...`);
      await db.collection(TARGET_COLLECTION).createIndex(
        { phone: 1 },
        { unique: true, sparse: true }
      );
      console.log(`Successfully created sparse unique phone index.`);
    }

    const updatedIndexes = await getExistingIndexes(db);
    console.log(
      `Final indexes on '${TARGET_COLLECTION}':`,
      updatedIndexes.map((idx) => `${idx.name} (sparse: ${Boolean(idx.sparse)})`)
    );
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

run();
