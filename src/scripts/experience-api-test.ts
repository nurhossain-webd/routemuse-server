import "dotenv/config";

import assert from "node:assert/strict";

import mongoose from "mongoose";
import request from "supertest";
import { z } from "zod";

const testEnvironmentSchema = z.object({
  TEST_MONGODB_URI: z.string().refine((value) => /(?:_|-)test(?:\?|$)/i.test(value), {
    message: "TEST_MONGODB_URI must name a dedicated test database",
  }),
});

const authSchema = z.object({
  data: z.object({ token: z.string(), user: z.object({ id: z.string() }) }),
});
const experienceSchema = z.object({
  data: z.object({ experience: z.object({ _id: z.string(), slug: z.string() }) }),
});
const listSchema = z.object({
  data: z.object({
    experiences: z.array(z.object({ slug: z.string() })),
    pagination: z.object({ total: z.number(), page: z.number() }),
  }),
});
const favoritesSchema = z.object({
  data: z.object({ favorites: z.array(z.unknown()) }),
});
const reviewsSchema = z.object({
  data: z.object({ reviews: z.array(z.object({ rating: z.number() })) }),
});

const makeExperience = (title: string, category: string, price: number) => ({
  title,
  shortDescription: "A carefully guided coastal experience with meaningful local context and excellent scenery.",
  fullDescription: "Explore coastal paths with an experienced local guide who explains ecology, community history, and responsible visitor practices throughout a relaxed and thoughtfully paced journey.",
  category,
  location: "Test Bay",
  country: "Testland",
  price,
  durationHours: 4,
  imageUrls: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80"],
  highlights: ["Guided coastal walk", "Local ecology interpretation"],
  included: ["Professional guide", "Drinking water"],
  excluded: ["Hotel transfer"],
  availableFrom: "2026-08-01T00:00:00.000Z",
  availableTo: "2028-12-31T23:59:59.000Z",
  status: "published",
});

const run = async (): Promise<void> => {
  const { TEST_MONGODB_URI } = testEnvironmentSchema.parse(process.env);
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = TEST_MONGODB_URI;

  const [
    { app },
    { connectDatabase },
    { UserModel },
    { ExperienceModel },
    { ReviewModel },
    { FavoriteModel },
    { UserInteractionModel },
  ] = await Promise.all([
    import("../app.js"),
    import("../config/database.js"),
    import("../models/user.model.js"),
    import("../models/experience.model.js"),
    import("../models/review.model.js"),
    import("../models/favorite.model.js"),
    import("../models/user-interaction.model.js"),
  ]);
  await connectDatabase();

  const marker = Date.now();
  const ownerEmail = `experience-owner-${marker}@example.com`;
  const otherEmail = `experience-other-${marker}@example.com`;
  let ownerId: string | undefined;
  let otherId: string | undefined;

  try {
    const ownerRegistration = await request(app).post("/api/v1/auth/register").send({
      name: "Experience Owner",
      email: ownerEmail,
      password: "Secure-Test-Password-42",
    });
    assert.equal(ownerRegistration.status, 201);
    const owner = authSchema.parse(ownerRegistration.body as unknown).data;
    ownerId = owner.user.id;

    const otherRegistration = await request(app).post("/api/v1/auth/register").send({
      name: "Another Traveler",
      email: otherEmail,
      password: "Secure-Test-Password-42",
    });
    assert.equal(otherRegistration.status, 201);
    const other = authSchema.parse(otherRegistration.body as unknown).data;
    otherId = other.user.id;

    const firstCreate = await request(app)
      .post("/api/v1/experiences")
      .set("Authorization", `Bearer ${owner.token}`)
      .send(makeExperience(`Coastal Discovery ${marker}`, "Nature", 75));
    assert.equal(firstCreate.status, 201);
    const first = experienceSchema.parse(firstCreate.body as unknown).data.experience;

    const secondCreate = await request(app)
      .post("/api/v1/experiences")
      .set("Authorization", `Bearer ${owner.token}`)
      .send(makeExperience(`Coastal Kayaking ${marker}`, "Nature", 110));
    assert.equal(secondCreate.status, 201);

    const listing = await request(app).get("/api/v1/experiences").query({
      search: "coastal",
      category: "nature",
      country: "testland",
      minPrice: 50,
      maxPrice: 100,
      minRating: 0,
      sort: "price_asc",
      page: 1,
      limit: 5,
    });
    assert.equal(listing.status, 200);
    const listed = listSchema.parse(listing.body as unknown);
    assert.equal(listed.data.pagination.page, 1);
    assert.equal(listed.data.experiences.some(({ slug }) => slug === first.slug), true);

    const detail = await request(app).get(`/api/v1/experiences/${first.slug}`);
    assert.equal(detail.status, 200);

    const related = await request(app).get(`/api/v1/experiences/${first.slug}/related`);
    assert.equal(related.status, 200);

    const favorite = await request(app)
      .post(`/api/v1/experiences/${first._id}/favorite`)
      .set("Authorization", `Bearer ${other.token}`);
    assert.equal(favorite.status, 201);

    const favorites = await request(app)
      .get("/api/v1/users/me/favorites")
      .set("Authorization", `Bearer ${other.token}`);
    assert.equal(favorites.status, 200);
    assert.equal(favoritesSchema.parse(favorites.body as unknown).data.favorites.length, 1);

    const review = await request(app)
      .post(`/api/v1/experiences/${first._id}/reviews`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ rating: 5, comment: "A thoughtful route, excellent guide, and genuinely useful local context." });
    assert.equal(review.status, 201);

    const duplicateReview = await request(app)
      .post(`/api/v1/experiences/${first._id}/reviews`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ rating: 4, comment: "This second review must be rejected by the API." });
    assert.equal(duplicateReview.status, 409);

    const reviews = await request(app).get(`/api/v1/experiences/${first._id}/reviews`);
    assert.equal(reviews.status, 200);
    assert.equal(reviewsSchema.parse(reviews.body as unknown).data.reviews.length, 1);
    assert.equal(
      (await UserInteractionModel.countDocuments({ experience: first._id })) >= 3,
      true,
    );

    const forbiddenDelete = await request(app)
      .delete(`/api/v1/experiences/${first._id}`)
      .set("Authorization", `Bearer ${other.token}`);
    assert.equal(forbiddenDelete.status, 403);

    const ownerDelete = await request(app)
      .delete(`/api/v1/experiences/${first._id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    assert.equal(ownerDelete.status, 200);

    assert.equal(await ReviewModel.countDocuments({ experience: first._id }), 0);
    assert.equal(await FavoriteModel.countDocuments({ experience: first._id }), 0);
    assert.equal(await UserInteractionModel.countDocuments({ experience: first._id }), 0);
    console.log("Experience API test passed");
  } finally {
    const userIds = [ownerId, otherId].filter((value): value is string => value !== undefined);
    const testExperiences = await ExperienceModel.find({ creator: { $in: userIds } }).select("_id");
    const experienceIds = testExperiences.map(({ _id }) => _id);
    await Promise.all([
      ReviewModel.deleteMany({ experience: { $in: experienceIds } }),
      FavoriteModel.deleteMany({ experience: { $in: experienceIds } }),
      UserInteractionModel.deleteMany({ experience: { $in: experienceIds } }),
      ExperienceModel.deleteMany({ _id: { $in: experienceIds } }),
      UserModel.deleteMany({ _id: { $in: userIds } }),
    ]);
    await mongoose.disconnect();
  }
};

run().catch((error: unknown) => {
  console.error("Experience API test failed:", error);
  process.exitCode = 1;
});
