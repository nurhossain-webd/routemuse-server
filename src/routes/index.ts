import { Router } from "express";

import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/health", healthRouter);
