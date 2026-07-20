import type { RequestHandler } from "express";
import { tripPlannerService } from "../services/ai/trip-planner.service.js";
import { AppError } from "../utils/app-error.js";
import { sendSuccess } from "../utils/api-response.js";
import { createTripPlanBodySchema, refineTripPlanBodySchema, tripPlanIdSchema } from "../validations/trip-plan.validation.js";

const userId = (request: Express.Request) => {
  if (!request.user) throw new AppError("Authentication is required", 401);
  return request.user._id.toString();
};

export const createTripPlan: RequestHandler = async (request, response) => {
  const result = await tripPlannerService.create(userId(request), createTripPlanBodySchema.parse(request.body));
  sendSuccess(response, { message: "Trip plan generated and saved", data: result, statusCode: 201 });
};
export const refineTripPlan: RequestHandler = async (request, response) => {
  const { instruction } = refineTripPlanBodySchema.parse(request.body);
  const { id } = tripPlanIdSchema.parse({ params: request.params }).params;
  const result = await tripPlannerService.refine(userId(request), id, instruction);
  sendSuccess(response, { message: "Trip plan refined", data: result });
};
export const listTripPlans: RequestHandler = async (request, response) => {
  sendSuccess(response, { message: "Trip plans retrieved", data: { plans: await tripPlannerService.list(userId(request)) } });
};
export const getTripPlan: RequestHandler = async (request, response) => {
  const { id } = tripPlanIdSchema.parse({ params: request.params }).params;
  sendSuccess(response, { message: "Trip plan retrieved", data: await tripPlannerService.get(userId(request), id) });
};
export const deleteTripPlan: RequestHandler = async (request, response) => {
  const { id } = tripPlanIdSchema.parse({ params: request.params }).params;
  await tripPlannerService.remove(userId(request), id);
  sendSuccess(response, { message: "Trip plan deleted", data: null });
};
