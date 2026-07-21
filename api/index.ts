import type { IncomingMessage, ServerResponse } from "http";
import { app } from "../src/app";
import { connectDatabase } from "../src/config/database";

let dbConnectPromise: Promise<void> | null = null;

async function ensureDb(): Promise<void> {
  if (!dbConnectPromise) {
    dbConnectPromise = connectDatabase().catch((err) => {
      // reset so next invocation can retry
      dbConnectPromise = null;
      throw err;
    });
  }

  return dbConnectPromise;
}

export default async function handler(req: IncomingMessage & { url?: string }, res: ServerResponse) {
  try {
    await ensureDb();
  } catch (err) {
    console.error("Database connection failed:", err);
    res.statusCode = 500;
    res.end("Database connection failed");
    return;
  }

  // Delegate to the Express app (Express app is a callable handler)
  return app(req as any, res as any);
}
