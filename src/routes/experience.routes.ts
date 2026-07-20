import { Router } from "express";

import {
  addReview,
  create,
  favorite,
  getExperience,
  getExperiences,
  getMine,
  getRelated,
  getReviews,
  remove,
  unfavorite,
} from "../controllers/experience.controller.js";
import { identifyOptionalUser, protect } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createExperienceSchema,
  reviewSchema,
} from "../validations/experience.validation.js";

export const experienceRouter = Router();

experienceRouter.get("/", asyncHandler(getExperiences));
experienceRouter.get("/mine", protect, asyncHandler(getMine));
experienceRouter.get("/:slug/related", asyncHandler(getRelated));
experienceRouter.get("/:experienceId/reviews", asyncHandler(getReviews));
experienceRouter.get("/:slug", identifyOptionalUser, asyncHandler(getExperience));
experienceRouter.post("/", protect, validateBody(createExperienceSchema), asyncHandler(create));
experienceRouter.delete("/:id", protect, asyncHandler(remove));
experienceRouter.post("/:id/favorite", protect, asyncHandler(favorite));
experienceRouter.delete("/:id/favorite", protect, asyncHandler(unfavorite));
experienceRouter.post("/:id/reviews", protect, validateBody(reviewSchema), asyncHandler(addReview));
