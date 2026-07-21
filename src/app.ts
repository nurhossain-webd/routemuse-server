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

const allowedOrigins = [
  "http://localhost:3000",
  "https://routemuse-client.vercel.app",
];

if (env.CLIENT_URL) {
  allowedOrigins.push(env.CLIENT_URL);
}

// Configure Helmet but allow popups to use window.postMessage (Google OAuth)
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: env.JSON_BODY_LIMIT }));

app.use(
  express.urlencoded({
    extended: true,
    limit: env.JSON_BODY_LIMIT,
  }),
);

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the RouteMuse API",
    healthCheck: "/api/v1/health",
  });
});

app.use("/api", apiRateLimiter);
app.use("/api/v1", apiRouter);
// Also mount the API router at `/api` and root so requests forwarded
// to the single Vercel function (or missing `/api/v1` prefix) still resolve.
app.use("/api", apiRouter);
app.use("/", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;