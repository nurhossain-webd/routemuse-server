import { z } from "zod";
import { recommendationFeedbackValues } from "../models/recommendation-feedback.model.js";
import { sanitizeText } from "../utils/sanitize.js";
const cleanOptional = (max: number) => z.string().trim().min(2).max(max).transform(sanitizeText).optional();
export const recommendationRefinementSchema = z.object({ category: cleanOptional(80), destination: cleanOptional(120), maximumPrice: z.coerce.number().positive().max(10_000_000).optional(), minimumRating: z.coerce.number().min(0).max(5).optional(), travelStyle: cleanOptional(80), request: cleanOptional(500) }).strict();
export const recommendationFeedbackSchema = z.object({ value: z.enum(recommendationFeedbackValues) }).strict();
export const recommendationExperienceParamsSchema = z.object({ experienceId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid experience id") });
export const preferencesSchema = z.object({ preferredCategories: z.array(z.string().trim().min(2).max(80).transform(sanitizeText)).max(12), preferredLocations: z.array(z.string().trim().min(2).max(120).transform(sanitizeText)).max(12), budgetMin: z.number().min(0).max(10_000_000).optional(), budgetMax: z.number().min(0).max(10_000_000).optional(), travelStyle: cleanOptional(80) }).strict().refine((value) => value.budgetMin === undefined || value.budgetMax === undefined || value.budgetMin <= value.budgetMax, { path: ["budgetMax"], message: "Maximum budget must be at least the minimum" });
export type RecommendationRefinementInput = z.infer<typeof recommendationRefinementSchema>;
