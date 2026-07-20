import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CLIENT_URL: z.url("CLIENT_URL must be a valid URL"),
  JSON_BODY_LIMIT: z.string().min(1).default("1mb"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(604_800),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600_000),
  AI_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
});

export type Environment = z.infer<typeof environmentSchema>;

export const validateEnvironment = (
  source: NodeJS.ProcessEnv,
): Environment => {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return result.data;
};
