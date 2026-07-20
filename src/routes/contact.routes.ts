import { Router } from "express";
import { createContactMessage } from "../controllers/contact.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { contactMessageSchema } from "../validations/contact.validation.js";
export const contactRouter = Router();
contactRouter.post("/", validateBody(contactMessageSchema), asyncHandler(createContactMessage));
