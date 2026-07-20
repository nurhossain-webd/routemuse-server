import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

import { UserModel, type UserRole } from "../models/user.model.js";
import { verifyAccessToken } from "../services/token.service.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const protect = asyncHandler(async (request, _response, next) => {
  const authorization = request.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("Authentication is required", 401);
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    throw new AppError("Authentication is required", 401);
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await UserModel.findById(payload.sub);

    if (!user) {
      throw new AppError("The user for this token no longer exists", 401);
    }

    request.user = user;
    next();
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError("Authentication token has expired", 401);
    }

    throw new AppError("Authentication token is invalid", 401);
  }
});

export const identifyOptionalUser = asyncHandler(async (request, _response, next) => {
  const authorization = request.get("authorization");
  if (!authorization?.startsWith("Bearer ")) { next(); return; }
  try {
    const payload = verifyAccessToken(authorization.slice(7).trim());
    const user = await UserModel.findById(payload.sub);
    if (user) request.user = user;
  } catch {
    next();
    return;
  }
  next();
});

export const restrictTo = (...roles: UserRole[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.user) {
      next(new AppError("Authentication is required", 401));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new AppError("You do not have permission to perform this action", 403));
      return;
    }

    next();
  };
