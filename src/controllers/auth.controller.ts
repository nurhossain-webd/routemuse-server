import type { RequestHandler } from "express";

import {
  authenticateWithGoogle,
  loginUser,
  registerUser,
  toPublicUser,
} from "../services/auth.service.js";
import { AppError } from "../utils/app-error.js";
import { sendSuccess } from "../utils/api-response.js";
import {
  googleAuthSchema,
  loginSchema,
  registerSchema,
} from "../validations/auth.validation.js";

export const register: RequestHandler = async (request, response) => {
  const input = registerSchema.parse(request.body as unknown);
  const result = await registerUser(input);

  sendSuccess(response, {
    message: "Registration successful",
    data: result,
    statusCode: 201,
  });
};

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body as unknown);
  const result = await loginUser(input);

  sendSuccess(response, { message: "Login successful", data: result });
};

export const googleLogin: RequestHandler = async (request, response) => {
  const { idToken } = googleAuthSchema.parse(request.body as unknown);
  const result = await authenticateWithGoogle(idToken);

  sendSuccess(response, { message: "Google login successful", data: result });
};

export const getMe: RequestHandler = (request, response) => {
  if (!request.user) {
    throw new AppError("Authentication is required", 401);
  }

  sendSuccess(response, {
    message: "Current user retrieved",
    data: { user: toPublicUser(request.user) },
  });
};

export const logout: RequestHandler = (_request, response) => {
  sendSuccess(response, {
    message: "Logout successful. Discard the access token on the client.",
    data: null,
  });
};
