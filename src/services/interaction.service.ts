import type { Types } from "mongoose";

import {
  UserInteractionModel,
  type InteractionType,
} from "../models/user-interaction.model.js";

export const recordInteraction = async (
  experience: Types.ObjectId,
  type: InteractionType,
  user?: Types.ObjectId,
  metadata: Record<string, string | number | boolean> = {},
): Promise<void> => {
  await UserInteractionModel.create({
    experience,
    type,
    ...(user !== undefined ? { user } : {}),
    metadata,
  });
};
