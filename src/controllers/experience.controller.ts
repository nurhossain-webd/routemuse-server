import type { RequestHandler } from "express";

import {
  addFavorite,
  createExperience,
  createReview,
  deleteExperience,
  getPublishedExperienceBySlug,
  getRelatedExperiences,
  listExperiences,
  listFavorites,
  listOwnExperiences,
  listReviews,
  removeFavorite,
} from "../services/experience.service.js";
import { recordInteraction } from "../services/interaction.service.js";
import { AppError } from "../utils/app-error.js";
import { sendSuccess } from "../utils/api-response.js";
import {
  createExperienceSchema,
  experienceListQuerySchema,
  objectIdParamsSchema,
  reviewListQuerySchema,
  reviewParamsSchema,
  reviewSchema,
  slugParamsSchema,
} from "../validations/experience.validation.js";

const requireUser = (request: Express.Request) => {
  if (!request.user) throw new AppError("Authentication is required", 401);
  return request.user;
};

export const getExperiences: RequestHandler = async (request, response) => {
  const query = experienceListQuerySchema.parse(request.query);
  const result = await listExperiences(query);
  sendSuccess(response, { message: "Experiences retrieved", data: result });
};

export const getExperience: RequestHandler = async (request, response) => {
  const { slug } = slugParamsSchema.parse(request.params);
  const experience = await getPublishedExperienceBySlug(slug);
  await recordInteraction(experience._id, "view", request.user?._id);
  sendSuccess(response, { message: "Experience retrieved", data: { experience } });
};

export const getRelated: RequestHandler = async (request, response) => {
  const { slug } = slugParamsSchema.parse(request.params);
  const experiences = await getRelatedExperiences(slug);
  sendSuccess(response, { message: "Related experiences retrieved", data: { experiences } });
};

export const create: RequestHandler = async (request, response) => {
  const user = requireUser(request);
  const input = createExperienceSchema.parse(request.body as unknown);
  const experience = await createExperience(input, user._id);
  sendSuccess(response, {
    message: "Experience created",
    data: { experience },
    statusCode: 201,
  });
};

export const getMine: RequestHandler = async (request, response) => {
  const user = requireUser(request);
  const experiences = await listOwnExperiences(user._id);
  sendSuccess(response, { message: "Your experiences retrieved", data: { experiences } });
};

export const remove: RequestHandler = async (request, response) => {
  const user = requireUser(request);
  const { id } = objectIdParamsSchema.parse(request.params);
  await deleteExperience(id, user);
  sendSuccess(response, { message: "Experience deleted", data: null });
};

export const favorite: RequestHandler = async (request, response) => {
  const user = requireUser(request);
  const { id } = objectIdParamsSchema.parse(request.params);
  await addFavorite(id, user._id);
  sendSuccess(response, { message: "Experience added to favorites", data: null, statusCode: 201 });
};

export const unfavorite: RequestHandler = async (request, response) => {
  const user = requireUser(request);
  const { id } = objectIdParamsSchema.parse(request.params);
  await removeFavorite(id, user._id);
  sendSuccess(response, { message: "Experience removed from favorites", data: null });
};

export const getFavorites: RequestHandler = async (request, response) => {
  const user = requireUser(request);
  const favorites = await listFavorites(user._id);
  sendSuccess(response, { message: "Favorites retrieved", data: { favorites } });
};

export const addReview: RequestHandler = async (request, response) => {
  const user = requireUser(request);
  const { id } = objectIdParamsSchema.parse(request.params);
  const input = reviewSchema.parse(request.body as unknown);
  const review = await createReview(id, user._id, input.rating, input.comment);
  sendSuccess(response, { message: "Review created", data: { review }, statusCode: 201 });
};

export const getReviews: RequestHandler = async (request, response) => {
  const { experienceId } = reviewParamsSchema.parse(request.params);
  const { page, limit } = reviewListQuerySchema.parse(request.query);
  const result = await listReviews(experienceId, page, limit);
  sendSuccess(response, { message: "Reviews retrieved", data: result });
};
