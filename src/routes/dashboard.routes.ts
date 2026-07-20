import { Router } from "express";
import { dashboardSummary } from "../controllers/dashboard.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
export const dashboardRouter = Router();
dashboardRouter.get("/summary", protect, asyncHandler(dashboardSummary));
