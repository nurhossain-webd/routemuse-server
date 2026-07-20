import { Schema, model, type Types } from "mongoose";

export const interactionTypes = [
  "view",
  "favorite",
  "unfavorite",
  "recommendation_click",
  "itinerary_add",
  "rating",
] as const;

export type InteractionType = (typeof interactionTypes)[number];

export interface UserInteraction {
  user?: Types.ObjectId;
  experience: Types.ObjectId;
  type: InteractionType;
  metadata: Record<string, string | number | boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userInteractionSchema = new Schema<UserInteraction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    experience: { type: Schema.Types.ObjectId, ref: "Experience", required: true },
    type: { type: String, enum: interactionTypes, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

userInteractionSchema.index({ user: 1, type: 1, createdAt: -1 });
userInteractionSchema.index({ experience: 1, type: 1, createdAt: -1 });

export const UserInteractionModel = model<UserInteraction>(
  "UserInteraction",
  userInteractionSchema,
);
