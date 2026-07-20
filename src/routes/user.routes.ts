import { Router } from "express";

import { getFavorites } from "../controllers/experience.controller.js";
import { updatePreferences } from "../controllers/recommendation.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const userRouter = Router();

userRouter.get("/me/favorites", protect, asyncHandler(getFavorites));
userRouter.put("/me/preferences", protect, asyncHandler(updatePreferences));
