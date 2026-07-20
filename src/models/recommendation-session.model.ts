import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface RankedRecommendation { experience: Types.ObjectId; baseScore: number; matchScore: number; reason: string; scoreFactors: string[] }
export interface RecommendationRefinement { category?: string; destination?: string; maximumPrice?: number; minimumRating?: number; travelStyle?: string; request?: string }
export interface RecommendationSession { user: Types.ObjectId; contextSummary: string; refinement: RecommendationRefinement; recommendations: RankedRecommendation[]; createdAt: Date; updatedAt: Date }
export type RecommendationSessionDocument = HydratedDocument<RecommendationSession>;

const rankedSchema = new Schema<RankedRecommendation>({
  experience: { type: Schema.Types.ObjectId, ref: "Experience", required: true },
  baseScore: { type: Number, required: true, min: 0, max: 100 },
  matchScore: { type: Number, required: true, min: 0, max: 100 },
  reason: { type: String, required: true, maxlength: 500 },
  scoreFactors: { type: [String], default: [] },
}, { _id: false });

const sessionSchema = new Schema<RecommendationSession>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  contextSummary: { type: String, required: true, maxlength: 1_000 },
  refinement: { type: Schema.Types.Mixed, default: {} },
  recommendations: { type: [rankedSchema], default: [] },
}, { timestamps: true, versionKey: false });
sessionSchema.index({ user: 1, createdAt: -1 });
export const RecommendationSessionModel = model<RecommendationSession>("RecommendationSession", sessionSchema);
