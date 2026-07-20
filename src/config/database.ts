import mongoose from "mongoose";

import { env } from "./env.js";

export type DatabaseStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "disconnecting"
  | "unknown";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connection established");
};

export const getDatabaseStatus = (): DatabaseStatus => {
  const statuses: Record<number, DatabaseStatus> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return statuses[mongoose.connection.readyState] ?? "unknown";
};
