import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";

const SALT_ROUNDS = 10;

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not set");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
    const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    const name = process.env.ADMIN_NAME || "Super Admin";

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const admin = await Admin.findOneAndUpdate(
      { email },
      {
        email,
        username,
        passwordHash,
        name,
        type: "admin",
        role: "superadmin",
      },
      { upsert: true, new: true }
    );

    console.log("✅ Admin created/updated:");
    console.log("  id:", admin._id.toString());
    console.log("  email:", admin.email);
    console.log("  username:", admin.username);
    console.log("  password:", password, "(change this in production!)");
  } catch (err) {
    console.error("❌ Failed to create admin:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
