import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env.js";
import type { UserRole } from "../models/user.model.js";

const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["user", "admin"] satisfies UserRole[]),
});

type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

export const issueAccessToken = (userId: string, role: UserRole): string =>
  jwt.sign({ role }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
    algorithm: "HS256",
  });

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload: unknown = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  });
  const result = accessTokenPayloadSchema.safeParse(payload);

  if (!result.success) {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }

  return result.data;
};
