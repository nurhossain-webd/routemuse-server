import { Router } from "express";
import { createTripPlan, deleteTripPlan, getTripPlan, listTripPlans, refineTripPlan } from "../controllers/trip-plan.controller.js";
import { getRecommendations, refineRecommendations, submitRecommendationFeedback } from "../controllers/recommendation.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { aiRateLimiter } from "../middleware/rate-limit.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createTripPlanBodySchema } from "../validations/trip-plan.validation.js";

export const aiRouter = Router();
aiRouter.use(protect);
aiRouter.get("/trip-plans", asyncHandler(listTripPlans));
aiRouter.get("/trip-plans/:id", asyncHandler(getTripPlan));
aiRouter.post("/trip-plans", aiRateLimiter, validateBody(createTripPlanBodySchema), asyncHandler(createTripPlan));
aiRouter.post("/trip-plans/:id/refine", aiRateLimiter, asyncHandler(refineTripPlan));
aiRouter.delete("/trip-plans/:id", asyncHandler(deleteTripPlan));
aiRouter.get("/recommendations", aiRateLimiter, asyncHandler(getRecommendations));
aiRouter.post("/recommendations/refine", aiRateLimiter, asyncHandler(refineRecommendations));
aiRouter.post("/recommendations/:experienceId/feedback", asyncHandler(submitRecommendationFeedback));
