import type { RequestHandler } from "express";
import { getDashboardSummary } from "../services/dashboard.service.js";
import { AppError } from "../utils/app-error.js";
import { sendSuccess } from "../utils/api-response.js";
export const dashboardSummary: RequestHandler = async (request, response) => { if (!request.user) throw new AppError("Authentication is required", 401); sendSuccess(response, { message: "Dashboard summary retrieved", data: await getDashboardSummary(request.user._id.toString()) }); };
