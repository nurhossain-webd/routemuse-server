import { rateLimit } from "express-rate-limit";

import { env } from "../config/env.js";

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_request, response, _next, options) => {
    response.status(options.statusCode).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
});
