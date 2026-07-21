import "dotenv/config";

import mongoose from "mongoose";
import { z } from "zod";

import { connectDatabase } from "../config/database.js";
import { ExperienceModel } from "../models/experience.model.js";
import { FavoriteModel } from "../models/favorite.model.js";
import { ReviewModel } from "../models/review.model.js";
import { UserModel } from "../models/user.model.js";
import { createReview } from "../services/experience.service.js";

const seedEnvironmentSchema = z.object({
  DEMO_USER_EMAIL: z.string().trim().toLowerCase().email(),
});

const reviews = [
  { rating: 5, comment: "This experience was outstanding and exceeded expectations." },
  { rating: 4, comment: "Very enjoyable trip with excellent guides." },
  { rating: 5, comment: "A truly memorable adventure with beautiful scenery." },
];

const seed = async (): Promise<void> => {
  const { DEMO_USER_EMAIL } = seedEnvironmentSchema.parse(process.env);
  await connectDatabase();

  const user = await UserModel.findOne({ email: DEMO_USER_EMAIL });
  if (!user) throw new Error("Demo user not found. Run npm run seed:demo first.");

  const experiences = await ExperienceModel.find({ status: "published" })
    .sort({ createdAt: 1 })
    .limit(5)
    .lean();

  if (experiences.length === 0) {
    throw new Error("No published experiences found. Run npm run seed:experiences first.");
  }

  for (const [index, experience] of experiences.entries()) {
    const favorite = await FavoriteModel.findOne({ user: user._id, experience: experience._id });
    if (!favorite) {
      await FavoriteModel.create({ user: user._id, experience: experience._id });
      console.log(`Added favorite for experience ${experience.slug}`);
    } else {
      console.log(`Favorite already exists for experience ${experience.slug}`);
    }

    if (index < reviews.length) {
      const review = await ReviewModel.findOne({ user: user._id, experience: experience._id });
      if (!review) {
        const reviewPayload = reviews[index]!;
        await createReview(experience._id.toString(), user._id, reviewPayload.rating, reviewPayload.comment);
        console.log(`Created review for experience ${experience.slug}`);
      } else {
        console.log(`Review already exists for experience ${experience.slug}`);
      }
    }
  }

  const favoriteCount = await FavoriteModel.countDocuments({ user: user._id });
  const reviewCount = await ReviewModel.countDocuments({ user: user._id });

  console.log(`Demo user now has ${favoriteCount} favorite(s) and ${reviewCount} review(s).`);
};

seed()
  .catch((error: unknown) => {
    console.error("Unable to seed interactions:", error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
