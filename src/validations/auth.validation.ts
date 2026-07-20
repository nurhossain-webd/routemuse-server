import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

const travelPreferencesSchema = z
  .object({
    preferredCategories: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    preferredLocations: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
    budgetMin: z.number().nonnegative().optional(),
    budgetMax: z.number().nonnegative().optional(),
    travelStyle: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
  .refine(
    ({ budgetMin, budgetMax }) =>
      budgetMin === undefined || budgetMax === undefined || budgetMin <= budgetMax,
    {
      message: "Maximum budget must be greater than or equal to minimum budget",
      path: ["budgetMax"],
    },
  );

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    password: z.string().min(8).max(72),
    avatar: z.url("Avatar must be a valid URL").optional(),
    travelPreferences: travelPreferencesSchema.optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(72),
  })
  .strict();

export const googleAuthSchema = z
  .object({ idToken: z.string().trim().min(1, "Google ID token is required") })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
