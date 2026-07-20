import "dotenv/config";

import assert from "node:assert/strict";

import mongoose from "mongoose";
import request from "supertest";
import { z } from "zod";

const testEnvironmentSchema = z.object({
  TEST_MONGODB_URI: z
    .string()
    .min(1)
    .refine((value) => /(?:_|-)test(?:\?|$)/i.test(value), {
      message: "TEST_MONGODB_URI must name a dedicated test database",
    }),
});

const authResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    token: z.string().min(1),
    user: z.object({
      email: z.string().email(),
    }),
  }),
});

const errorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

const meResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: z.object({
      email: z.string().email(),
      passwordHash: z.never().optional(),
    }),
  }),
});

const run = async (): Promise<void> => {
  const { TEST_MONGODB_URI } = testEnvironmentSchema.parse(process.env);
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = TEST_MONGODB_URI;

  const [{ app }, { connectDatabase }, { UserModel }] = await Promise.all([
    import("../app.js"),
    import("../config/database.js"),
    import("../models/user.model.js"),
  ]);

  await connectDatabase();

  const email = `auth-test-${Date.now()}@example.com`;
  const password = "Secure-Test-Password-42";

  try {
    const registration = await request(app).post("/api/v1/auth/register").send({
      name: "Integration Test User",
      email: email.toUpperCase(),
      password,
    });
    assert.equal(registration.status, 201);
    const registered = authResponseSchema.parse(registration.body as unknown);
    assert.equal(registered.data.user.email, email);

    const invalidLogin = await request(app).post("/api/v1/auth/login").send({
      email,
      password: "incorrect-password",
    });
    assert.equal(invalidLogin.status, 401);
    const invalidLoginBody = errorResponseSchema.parse(
      invalidLogin.body as unknown,
    );
    assert.equal(invalidLoginBody.success, false);

    const login = await request(app).post("/api/v1/auth/login").send({
      email,
      password,
    });
    assert.equal(login.status, 200);
    const authenticated = authResponseSchema.parse(login.body as unknown);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${authenticated.data.token}`);
    assert.equal(me.status, 200);
    const currentUser = meResponseSchema.parse(me.body as unknown);
    assert.equal(currentUser.data.user.email, email);
    assert.equal("passwordHash" in currentUser.data.user, false);

    console.log("Auth integration test passed");
  } finally {
    await UserModel.deleteOne({ email });
    await mongoose.disconnect();
  }
};

run().catch((error: unknown) => {
  console.error("Auth integration test failed:", error);
  process.exitCode = 1;
});
