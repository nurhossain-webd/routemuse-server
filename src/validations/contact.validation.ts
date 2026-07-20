import { z } from "zod";
import { sanitizeText } from "../utils/sanitize.js";
const clean = (min: number, max: number) => z.string().trim().min(min).max(max).transform(sanitizeText);
export const contactMessageSchema = z.object({ name: clean(2, 80), email: z.email().trim().toLowerCase().max(254), subject: clean(3, 140), message: clean(10, 5_000), website: z.string().max(0).optional() }).strict();
