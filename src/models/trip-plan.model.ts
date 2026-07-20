import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface ItineraryItem {
  time: string;
  title: string;
  description: string;
  location: string;
  experience?: Types.ObjectId;
  durationHours: number;
  estimatedCost: number;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  summary: string;
  items: ItineraryItem[];
}

export interface TripPlan {
  user: Types.ObjectId;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  groupSize: number;
  travelStyle: string;
  interests: string[];
  itineraryDays: ItineraryDay[];
  selectedExperiences: Types.ObjectId[];
  estimatedTotal: number;
  agentExplanation: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TripPlanDocument = HydratedDocument<TripPlan>;

const itineraryItemSchema = new Schema<ItineraryItem>({
  time: { type: String, required: true, maxlength: 20 },
  title: { type: String, required: true, maxlength: 140 },
  description: { type: String, required: true, maxlength: 500 },
  location: { type: String, required: true, maxlength: 140 },
  experience: { type: Schema.Types.ObjectId, ref: "Experience" },
  durationHours: { type: Number, required: true, min: 0, max: 24 },
  estimatedCost: { type: Number, required: true, min: 0 },
}, { _id: false });

const itineraryDaySchema = new Schema<ItineraryDay>({
  dayNumber: { type: Number, required: true, min: 1 },
  date: { type: String, required: true },
  title: { type: String, required: true, maxlength: 140 },
  summary: { type: String, required: true, maxlength: 500 },
  items: { type: [itineraryItemSchema], default: [] },
}, { _id: false });

const tripPlanSchema = new Schema<TripPlan>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  destination: { type: String, required: true, trim: true, maxlength: 120 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  budget: { type: Number, required: true, min: 0 },
  groupSize: { type: Number, required: true, min: 1, max: 50 },
  travelStyle: { type: String, required: true, trim: true, maxlength: 80 },
  interests: { type: [String], required: true },
  itineraryDays: { type: [itineraryDaySchema], required: true },
  selectedExperiences: [{ type: Schema.Types.ObjectId, ref: "Experience" }],
  estimatedTotal: { type: Number, required: true, min: 0 },
  agentExplanation: { type: String, required: true, maxlength: 2_000 },
}, { timestamps: true, versionKey: false });

tripPlanSchema.index({ user: 1, createdAt: -1 });
tripPlanSchema.pre("validate", function validateDates() {
  if (this.startDate > this.endDate) this.invalidate("endDate", "End date must follow start date");
});

export const TripPlanModel = model<TripPlan>("TripPlan", tripPlanSchema);
