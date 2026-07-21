import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { apiRateLimiter } from "./middleware/rate-limit.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    // If CLIENT_URL is set, restrict to that origin. Otherwise reflect request origin.
    origin: env.CLIENT_URL ?? true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.JSON_BODY_LIMIT }));

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api", apiRateLimiter);
app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
