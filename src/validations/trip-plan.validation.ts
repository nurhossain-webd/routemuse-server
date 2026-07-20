import { z } from "zod";
import { sanitizeText } from "../utils/sanitize.js";

const text = (min: number, max: number) => z.string().trim().min(min).max(max).transform((value) => sanitizeText(value));
const isoDate = z.iso.date();

export const createTripPlanBodySchema = z.object({
  title: text(3, 140).optional(), destination: text(2, 120), startDate: isoDate, endDate: isoDate,
  budget: z.coerce.number().positive().max(10_000_000), groupSize: z.coerce.number().int().min(1).max(50),
  travelStyle: text(2, 80), interests: z.array(text(2, 60)).min(1).max(10),
}).strict().superRefine((value, context) => {
  const start = new Date(`${value.startDate}T00:00:00.000Z`);
  const end = new Date(`${value.endDate}T00:00:00.000Z`);
  if (end < start) context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after start date" });
  if ((end.getTime() - start.getTime()) / 86_400_000 > 30) context.addIssue({ code: "custom", path: ["endDate"], message: "Trips may be at most 31 days" });
});

export const refineTripPlanBodySchema = z.object({ instruction: text(3, 500) }).strict();
export const refineTripPlanSchema = z.object({ body: refineTripPlanBodySchema, params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid plan id") }) });
export const tripPlanIdSchema = z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid plan id") }) });

export type CreateTripPlanInput = z.infer<typeof createTripPlanBodySchema>;
