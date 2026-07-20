import "dotenv/config";

import { validateEnvironment } from "../validations/env.validation.js";

export const env = validateEnvironment(process.env);
