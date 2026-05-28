/**
 * Migration: remove stored `null` values from email and phone fields on the users collection.
 *
 * MongoDB sparse unique indexes still include documents where the field exists with value null.
 * Only truly absent fields are skipped. This migration $unsets email/phone on documents where
 * the value is null, allowing the sparse index to ignore them and preventing E11000 on upserts.
 *
 * Usage:
 *   node server/scripts/migrate-drop-email-index.js [--dry-run] [--test]
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env (two levels up from server/scripts/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isTest = args.includes("--test");

const TARGET_COLLECTION = "users";

const connectDb = async () => {
  const uri = isTest
    ? "mongodb://localhost:27017/bbq-test"
    : process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    throw new Error("Neither MONGODB_URI nor MONGO_URI environment variable is set");
  }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${uri.replace(/\/\/.*@/, "//***@")}`);
};

const run = async () => {
  try {
    await connectDb();
    const db = mongoose.connection.db;
    const collection = db.collection(TARGET_COLLECTION);

    // BSON type 10 = null — matches only docs where the field exists and is explicitly null
    const nullEmailCount = await collection.countDocuments({ email: { $type: 10 } });
    const nullPhoneCount = await collection.countDocuments({ phone: { $type: 10 } });

    console.log(`Documents with stored email: null — ${nullEmailCount}`);
    console.log(`Documents with stored phone: null — ${nullPhoneCount}`);

    if (nullEmailCount === 0 && nullPhoneCount === 0) {
      console.log("No documents with null email/phone fields found — nothing to do.");
      return;
    }

    if (isDryRun) {
      console.log(`[DRY RUN] Would $unset 'email' on ${nullEmailCount} document(s) where email is null.`);
      console.log(`[DRY RUN] Would $unset 'phone' on ${nullPhoneCount} document(s) where phone is null.`);
      return;
    }

    // Unset email field on documents where it's explicitly null
    if (nullEmailCount > 0) {
      const emailResult = await collection.updateMany(
        { email: { $type: 10 } },
        { $unset: { email: "" } }
      );
      console.log(`Unset 'email' on ${emailResult.modifiedCount} document(s).`);
    }

    // Unset phone field on documents where it's explicitly null
    if (nullPhoneCount > 0) {
      const phoneResult = await collection.updateMany(
        { phone: { $type: 10 } },
        { $unset: { phone: "" } }
      );
      console.log(`Unset 'phone' on ${phoneResult.modifiedCount} document(s).`);
    }

    // Verify the cleanup
    const remainingNullEmail = await collection.countDocuments({ email: { $type: 10 } });
    const remainingNullPhone = await collection.countDocuments({ phone: { $type: 10 } });
    console.log(`Remaining null email docs: ${remainingNullEmail}`);
    console.log(`Remaining null phone docs: ${remainingNullPhone}`);

    console.log("Migration complete. Sparse indexes will now correctly skip these documents.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

run();
