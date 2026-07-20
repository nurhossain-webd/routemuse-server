import { Router } from "express";

import {
  getMe,
  googleLogin,
  login,
  logout,
  register,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  googleAuthSchema,
  loginSchema,
  registerSchema,
} from "../validations/auth.validation.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), asyncHandler(register));
authRouter.post("/login", validateBody(loginSchema), asyncHandler(login));
authRouter.post(
  "/google",
  validateBody(googleAuthSchema),
  asyncHandler(googleLogin),
);
authRouter.get("/me", protect, asyncHandler(getMe));
authRouter.post("/logout", protect, asyncHandler(logout));
