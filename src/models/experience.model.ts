import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export const experienceStatuses = ["published", "archived"] as const;
export type ExperienceStatus = (typeof experienceStatuses)[number];

export interface Experience {
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  location: string;
  country: string;
  price: number;
  durationHours: number;
  ratingAverage: number;
  ratingCount: number;
  imageUrls: string[];
  highlights: string[];
  included: string[];
  excluded: string[];
  availableFrom: Date;
  availableTo: Date;
  creator: Types.ObjectId;
  status: ExperienceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ExperienceDocument = HydratedDocument<Experience>;

const experienceSchema = new Schema<Experience>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    slug: { type: String, required: true, trim: true, maxlength: 120 },
    shortDescription: { type: String, required: true, trim: true, maxlength: 280 },
    fullDescription: { type: String, required: true, trim: true, maxlength: 10_000 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
    price: { type: Number, required: true, min: 0 },
    durationHours: { type: Number, required: true, min: 0.5, max: 720 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    imageUrls: { type: [String], required: true },
    highlights: { type: [String], default: [] },
    included: { type: [String], default: [] },
    excluded: { type: [String], default: [] },
    availableFrom: { type: Date, required: true },
    availableTo: { type: Date, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: experienceStatuses, default: "published" },
  },
  { timestamps: true, versionKey: false },
);

experienceSchema.index({ slug: 1 }, { unique: true });
experienceSchema.index({ title: "text", shortDescription: "text", fullDescription: "text", location: "text", country: "text" });
experienceSchema.index({ status: 1, category: 1, country: 1, price: 1 });
experienceSchema.index({ status: 1, ratingAverage: -1, createdAt: -1 });
experienceSchema.index({ creator: 1, createdAt: -1 });

experienceSchema.pre("validate", function validateAvailability() {
  if (this.availableFrom > this.availableTo) {
    this.invalidate("availableTo", "Availability end must be after its start");
  }
});

export const ExperienceModel = model<Experience>("Experience", experienceSchema);
