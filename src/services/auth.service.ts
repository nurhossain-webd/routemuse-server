import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env.js";
import { UserModel, type UserDocument } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { normalizeEmail } from "../utils/normalize-email.js";
import type { LoginInput, RegisterInput } from "../validations/auth.validation.js";
import { issueAccessToken } from "./token.service.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "user" | "admin";
  authProvider: "local" | "google";
  travelPreferences: UserDocument["travelPreferences"];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

const buildTravelPreferences = (
  preferences: RegisterInput["travelPreferences"],
): UserDocument["travelPreferences"] => ({
  preferredCategories: preferences?.preferredCategories ?? [],
  preferredLocations: preferences?.preferredLocations ?? [],
  ...(preferences?.budgetMin !== undefined
    ? { budgetMin: preferences.budgetMin }
    : {}),
  ...(preferences?.budgetMax !== undefined
    ? { budgetMax: preferences.budgetMax }
    : {}),
  ...(preferences?.travelStyle !== undefined
    ? { travelStyle: preferences.travelStyle }
    : {}),
});

export const toPublicUser = (user: UserDocument): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar ?? null,
  role: user.role,
  authProvider: user.authProvider,
  travelPreferences: user.travelPreferences,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const createAuthResult = (user: UserDocument): AuthResult => ({
  token: issueAccessToken(user.id, user.role),
  user: toPublicUser(user),
});

export const registerUser = async (input: RegisterInput): Promise<AuthResult> => {
  const email = normalizeEmail(input.email);
  const existingUser = await UserModel.exists({ email });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await UserModel.create({
    name: input.name,
    email,
    passwordHash,
    ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
    role: "user",
    authProvider: "local",
    travelPreferences: buildTravelPreferences(input.travelPreferences),
  });

  return createAuthResult(user);
};

export const loginUser = async (input: LoginInput): Promise<AuthResult> => {
  const email = normalizeEmail(input.email);
  const user = await UserModel.findOne({ email }).select("+passwordHash");

  if (!user?.passwordHash || user.authProvider !== "local") {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  return createAuthResult(user);
};

export const authenticateWithGoogle = async (
  idToken: string,
): Promise<AuthResult> => {
  const ticket = await googleClient
    .verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    })
    .catch(() => {
      throw new AppError("Google ID token is invalid or expired", 401);
    });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new AppError("Google token does not contain a verified email", 401);
  }

  const email = normalizeEmail(payload.email);
  let user = await UserModel.findOne({
    $or: [{ googleId: payload.sub }, { email }],
  }).select("+googleId");

  if (user && user.authProvider !== "google") {
    throw new AppError(
      "An account with this email already uses password login",
      409,
    );
  }

  if (user?.googleId && user.googleId !== payload.sub) {
    throw new AppError("Google account does not match the existing user", 409);
  }

  user ??= await UserModel.create({
    name: payload.name?.trim() || email.slice(0, email.indexOf("@")) || "Traveler",
    email,
    ...(payload.picture !== undefined ? { avatar: payload.picture } : {}),
    role: "user",
    authProvider: "google",
    googleId: payload.sub,
    travelPreferences: {},
  });

  return createAuthResult(user);
};
