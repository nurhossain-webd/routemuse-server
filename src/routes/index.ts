import { Router } from "express";

import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { experienceRouter } from "./experience.routes.js";
import { userRouter } from "./user.routes.js";
import { aiRouter } from "./ai.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/experiences", experienceRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/ai", aiRouter);
