import type { IncomingMessage, ServerResponse } from "http";

import { app } from "../src/app";
import { connectDatabase } from "../src/config/database";

let dbConnectPromise: Promise<void> | null = null;

async function ensureDb(): Promise<void> {
  if (!dbConnectPromise) {
    dbConnectPromise = connectDatabase().catch((error) => {
      dbConnectPromise = null;
      throw error;
    });
  }

  return dbConnectPromise;
}

export default async function handler(
  req: IncomingMessage & { url?: string; method?: string },
  res: ServerResponse,
) {
  // Let Express handle CORS preflight without waiting for MongoDB.
  if (req.method === "OPTIONS") {
    return app(req as any, res as any);
  }

  try {
    await ensureDb();
    return app(req as any, res as any);
  } catch (error) {
    console.error("Database connection failed:", error);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: "Database connection failed",
      }),
    );
  }
}