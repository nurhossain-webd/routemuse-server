import "dotenv/config";

import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { UserModel } from "../models/user.model.js";
import { normalizeEmail } from "../utils/normalize-email.js";

const demoEnvironmentSchema = z.object({
  DEMO_USER_NAME: z.string().trim().min(2).max(80),
  DEMO_USER_EMAIL: z.string().trim().email(),
  DEMO_USER_PASSWORD: z.string().min(8).max(72),
});

const seedDemoUser = async (): Promise<void> => {
  const demo = demoEnvironmentSchema.parse(process.env);
  await connectDatabase();

  const email = normalizeEmail(demo.DEMO_USER_EMAIL);
  const passwordHash = await bcrypt.hash(
    demo.DEMO_USER_PASSWORD,
    env.BCRYPT_ROUNDS,
  );

  const existingUser = await UserModel.findOne({ email });
  if (existingUser?.authProvider === "google") {
    throw new Error(
      "The demo email belongs to a Google account; choose a different email",
    );
  }

  await UserModel.findOneAndUpdate(
    { email },
    {
      $set: {
        name: demo.DEMO_USER_NAME,
        passwordHash,
        authProvider: "local",
        role: "user",
      },
      $setOnInsert: { travelPreferences: {} },
    },
    { upsert: true, runValidators: true },
  );

  console.log(`Demo user ready: ${email}`);
};

seedDemoUser()
  .catch((error: unknown) => {
    console.error("Unable to seed demo user:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
