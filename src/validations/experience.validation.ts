import { Types } from "mongoose";
import { z } from "zod";

import { experienceStatuses } from "../models/experience.model.js";
import { sanitizeText } from "../utils/sanitize.js";

const cleanString = (minimum: number, maximum: number) =>
  z.string().transform(sanitizeText).pipe(z.string().min(minimum).max(maximum));

const cleanList = (maximumItems: number, maximumLength = 180) =>
  z.array(cleanString(1, maximumLength)).min(1).max(maximumItems);

const remoteImageUrlSchema = z.url().refine(
  (value) => ["http:", "https:"].includes(new URL(value).protocol),
  "Image URL must use HTTP or HTTPS",
);

export const createExperienceSchema = z
  .object({
    title: cleanString(3, 140),
    shortDescription: cleanString(20, 280),
    fullDescription: cleanString(50, 10_000),
    category: cleanString(2, 80),
    location: cleanString(2, 120),
    country: cleanString(2, 100),
    price: z.number().nonnegative().max(1_000_000),
    durationHours: z.number().min(0.5).max(720),
    imageUrls: z.array(remoteImageUrlSchema).min(1).max(12),
    highlights: cleanList(20),
    included: cleanList(30),
    excluded: z.array(cleanString(1, 180)).max(30).default([]),
    availableFrom: z.coerce.date(),
    availableTo: z.coerce.date(),
    status: z.enum(experienceStatuses).default("published"),
  })
  .strict()
  .refine(({ availableFrom, availableTo }) => availableFrom <= availableTo, {
    message: "Availability end must be after its start",
    path: ["availableTo"],
  });

export const reviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: cleanString(3, 2_000),
  })
  .strict();

export const objectIdParamsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid experience ID"),
});

export const reviewParamsSchema = z.object({
  experienceId: z.string().refine(
    (value) => Types.ObjectId.isValid(value),
    "Invalid experience ID",
  ),
});

export const slugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const experienceListQuerySchema = z
  .object({
    search: cleanString(1, 100).optional(),
    category: cleanString(1, 80).optional(),
    country: cleanString(1, 100).optional(),
    location: cleanString(1, 120).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).default("newest"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(12),
  })
  .strict()
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    { message: "Maximum price must be greater than or equal to minimum price", path: ["maxPrice"] },
  );

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).strict();

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type ExperienceListQuery = z.infer<typeof experienceListQuerySchema>;
