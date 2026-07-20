import type { RequestHandler } from "express";

import { getDatabaseStatus } from "../config/database.js";
import { env } from "../config/env.js";
import { sendSuccess } from "../utils/api-response.js";

export const getHealth: RequestHandler = (_request, response) => {
  sendSuccess(response, {
    message: "RouteMuse API is healthy",
    data: {
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: {
        status: getDatabaseStatus(),
      },
    },
  });
};
