import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface Review {
  experience: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<Review>;

const reviewSchema = new Schema<Review>(
  {
    experience: { type: Schema.Types.ObjectId, ref: "Experience", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 2_000 },
  },
  { timestamps: true, versionKey: false },
);

reviewSchema.index({ experience: 1, user: 1 }, { unique: true });
reviewSchema.index({ experience: 1, createdAt: -1 });

export const ReviewModel = model<Review>("Review", reviewSchema);
