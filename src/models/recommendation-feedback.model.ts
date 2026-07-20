import { Schema, model, type Types } from "mongoose";
export const recommendationFeedbackValues = ["interested", "not_interested", "saved", "opened"] as const;
export type RecommendationFeedbackValue = typeof recommendationFeedbackValues[number];
export interface RecommendationFeedback { user: Types.ObjectId; experience: Types.ObjectId; value: RecommendationFeedbackValue; createdAt: Date; updatedAt: Date }
const schema = new Schema<RecommendationFeedback>({ user: { type: Schema.Types.ObjectId, ref: "User", required: true }, experience: { type: Schema.Types.ObjectId, ref: "Experience", required: true }, value: { type: String, enum: recommendationFeedbackValues, required: true } }, { timestamps: true, versionKey: false });
schema.index({ user: 1, experience: 1, createdAt: -1 });
schema.index({ user: 1, value: 1, updatedAt: -1 });
export const RecommendationFeedbackModel = model<RecommendationFeedback>("RecommendationFeedback", schema);
