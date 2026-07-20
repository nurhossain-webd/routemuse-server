import { Schema, model, type Types } from "mongoose";

export interface Favorite {
  user: Types.ObjectId;
  experience: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<Favorite>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    experience: { type: Schema.Types.ObjectId, ref: "Experience", required: true },
  },
  { timestamps: true, versionKey: false },
);

favoriteSchema.index({ user: 1, experience: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });

export const FavoriteModel = model<Favorite>("Favorite", favoriteSchema);
