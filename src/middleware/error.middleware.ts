import type { ErrorRequestHandler } from "express";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  void _next;

  const appError =
    error instanceof AppError
      ? error
      : new AppError("An unexpected error occurred", 500, false);

  if (!appError.isOperational) {
    console.error(error);
  }

  response.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    ...(env.NODE_ENV === "development" && error instanceof Error
      ? { stack: error.stack }
      : {}),
  });
};
