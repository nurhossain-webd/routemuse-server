import { type SortOrder, Types } from "mongoose";

import {
  ExperienceModel,
  type ExperienceDocument,
} from "../models/experience.model.js";
import { FavoriteModel } from "../models/favorite.model.js";
import { ReviewModel } from "../models/review.model.js";
import { UserInteractionModel } from "../models/user-interaction.model.js";
import type { UserDocument } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { createSlug } from "../utils/sanitize.js";
import type {
  CreateExperienceInput,
  ExperienceListQuery,
} from "../validations/experience.validation.js";
import { recordInteraction } from "./interaction.service.js";

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface ExperienceFilter {
  status: "published";
  $text?: { $search: string };
  category?: RegExp;
  country?: RegExp;
  location?: RegExp;
  ratingAverage?: { $gte: number };
  price?: { $gte?: number; $lte?: number };
}

const createUniqueSlug = async (title: string): Promise<string> => {
  const baseSlug = createSlug(title) || "experience";
  if (!(await ExperienceModel.exists({ slug: baseSlug }))) {
    return baseSlug;
  }

  return `${baseSlug}-${new Types.ObjectId().toString().slice(-6)}`;
};

export const listExperiences = async (query: ExperienceListQuery) => {
  const filter: ExperienceFilter = { status: "published" };

  if (query.search) filter.$text = { $search: query.search };
  if (query.category) filter.category = new RegExp(`^${escapeRegex(query.category)}$`, "i");
  if (query.country) filter.country = new RegExp(`^${escapeRegex(query.country)}$`, "i");
  if (query.location) filter.location = new RegExp(escapeRegex(query.location), "i");
  if (query.minRating !== undefined) filter.ratingAverage = { $gte: query.minRating };
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {
      ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
    };
  }

  const sorts: Record<ExperienceListQuery["sort"], Record<string, SortOrder>> = {
    newest: { createdAt: -1 },
    price_asc: { price: 1, createdAt: -1 },
    price_desc: { price: -1, createdAt: -1 },
    rating: { ratingAverage: -1, ratingCount: -1, createdAt: -1 },
  };
  const skip = (query.page - 1) * query.limit;

  const [experiences, total] = await Promise.all([
    ExperienceModel.find(filter)
      .populate("creator", "name avatar")
      .sort(sorts[query.sort])
      .skip(skip)
      .limit(query.limit)
      .lean(),
    ExperienceModel.countDocuments(filter),
  ]);

  return {
    experiences,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getPublishedExperienceBySlug = async (
  slug: string,
): Promise<ExperienceDocument> => {
  const experience = await ExperienceModel.findOne({ slug, status: "published" }).populate(
    "creator",
    "name avatar",
  );
  if (!experience) throw new AppError("Experience not found", 404);
  return experience;
};

export const getRelatedExperiences = async (slug: string) => {
  const source = await ExperienceModel.findOne({ slug, status: "published" });
  if (!source) throw new AppError("Experience not found", 404);

  return ExperienceModel.find({
    _id: { $ne: source._id },
    status: "published",
    $or: [{ category: source.category }, { country: source.country }],
  })
    .sort({ ratingAverage: -1, ratingCount: -1 })
    .limit(6)
    .lean();
};

export const createExperience = async (
  input: CreateExperienceInput,
  creator: Types.ObjectId,
): Promise<ExperienceDocument> =>
  ExperienceModel.create({
    ...input,
    slug: await createUniqueSlug(input.title),
    creator,
    ratingAverage: 0,
    ratingCount: 0,
  });

export const listOwnExperiences = async (creator: Types.ObjectId) =>
  ExperienceModel.find({ creator }).sort({ createdAt: -1 }).lean();

export const deleteExperience = async (
  id: string,
  actor: UserDocument,
): Promise<void> => {
  const experience = await ExperienceModel.findById(id);
  if (!experience) throw new AppError("Experience not found", 404);

  if (!experience.creator.equals(actor._id) && actor.role !== "admin") {
    throw new AppError("You may delete only experiences you created", 403);
  }

  await Promise.all([
    ReviewModel.deleteMany({ experience: experience._id }),
    FavoriteModel.deleteMany({ experience: experience._id }),
    UserInteractionModel.deleteMany({ experience: experience._id }),
    experience.deleteOne(),
  ]);
};

export const addFavorite = async (
  experienceId: string,
  userId: Types.ObjectId,
): Promise<void> => {
  const experience = await ExperienceModel.findOne({
    _id: experienceId,
    status: "published",
  });
  if (!experience) throw new AppError("Experience not found", 404);

  try {
    await FavoriteModel.create({ user: userId, experience: experience._id });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === 11_000
    ) {
      throw new AppError("Experience is already in favorites", 409);
    }
    throw error;
  }

  await recordInteraction(experience._id, "favorite", userId);
};

export const removeFavorite = async (
  experienceId: string,
  userId: Types.ObjectId,
): Promise<void> => {
  const favorite = await FavoriteModel.findOneAndDelete({
    user: userId,
    experience: experienceId,
  });
  if (!favorite) throw new AppError("Favorite not found", 404);

  await recordInteraction(favorite.experience, "unfavorite", userId);
};

export const listFavorites = async (userId: Types.ObjectId) =>
  FavoriteModel.find({ user: userId })
    .populate({ path: "experience", match: { status: "published" } })
    .sort({ createdAt: -1 })
    .lean();

export const createReview = async (
  experienceId: string,
  userId: Types.ObjectId,
  rating: number,
  comment: string,
) => {
  const experience = await ExperienceModel.findOne({
    _id: experienceId,
    status: "published",
  });
  if (!experience) throw new AppError("Experience not found", 404);

  if (await ReviewModel.exists({ experience: experience._id, user: userId })) {
    throw new AppError("You have already reviewed this experience", 409);
  }

  let review;
  try {
    review = await ReviewModel.create({
      experience: experience._id,
      user: userId,
      rating,
      comment,
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === 11_000
    ) {
      throw new AppError("You have already reviewed this experience", 409);
    }
    throw error;
  }

  await ExperienceModel.updateOne(
    { _id: experience._id },
    [
      {
        $set: {
          ratingAverage: {
            $divide: [
              { $add: [{ $multiply: ["$ratingAverage", "$ratingCount"] }, rating] },
              { $add: ["$ratingCount", 1] },
            ],
          },
          ratingCount: { $add: ["$ratingCount", 1] },
        },
      },
    ],
    { updatePipeline: true },
  );
  await recordInteraction(experience._id, "rating", userId, { rating });

  return review.populate("user", "name avatar");
};

export const listReviews = async (
  experienceId: string,
  page: number,
  limit: number,
) => {
  if (!(await ExperienceModel.exists({ _id: experienceId, status: "published" }))) {
    throw new AppError("Experience not found", 404);
  }
  const filter = { experience: experienceId };
  const [reviews, total] = await Promise.all([
    ReviewModel.find(filter)
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments(filter),
  ]);
  return { reviews, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
