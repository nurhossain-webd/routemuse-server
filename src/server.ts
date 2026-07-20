import type { Server } from "node:http";

import mongoose from "mongoose";

import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

let server: Server | undefined;

const startServer = async (): Promise<void> => {
  await connectDatabase();

  server = app.listen(env.PORT, () => {
    console.log(
      `RouteMuse API running in ${env.NODE_ENV} mode on port ${env.PORT}`,
    );
  });
};

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (!server) {
    void mongoose.disconnect().finally(() => process.exit(0));
    return;
  }

  server.close(() => {
    void mongoose.disconnect().finally(() => process.exit(0));
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer().catch((error: unknown) => {
  console.error("Unable to start RouteMuse API:", error);
  process.exit(1);
});
