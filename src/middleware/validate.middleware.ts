import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../utils/app-error.js";

export const validateBody = (schema: ZodType): RequestHandler =>
  (request, _response, next) => {
    const result = schema.safeParse(request.body as unknown);

    if (!result.success) {
      next(
        new AppError(
          "Request validation failed",
          400,
          true,
          result.error.flatten().fieldErrors,
        ),
      );
      return;
    }

    request.body = result.data;
    next();
  };
