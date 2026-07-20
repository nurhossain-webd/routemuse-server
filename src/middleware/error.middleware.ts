import type { ErrorRequestHandler } from "express";
import { MongoServerError } from "mongodb";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  void _next;

  const appError = (() => {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof MongoServerError && error.code === 11_000) {
      return new AppError("Email is already registered", 409);
    }

    return new AppError("An unexpected error occurred", 500, false);
  })();

  if (!appError.isOperational) {
    console.error(error);
  }

  response.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    ...(appError.details !== undefined ? { errors: appError.details } : {}),
    ...(env.NODE_ENV === "development" && error instanceof Error
      ? { stack: error.stack }
      : {}),
  });
};
