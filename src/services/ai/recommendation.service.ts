import { Types } from "mongoose";
import { z } from "zod";
import { ExperienceModel, type Experience } from "../../models/experience.model.js";
import { FavoriteModel } from "../../models/favorite.model.js";
import { RecommendationFeedbackModel, type RecommendationFeedbackValue } from "../../models/recommendation-feedback.model.js";
import { RecommendationSessionModel, type RecommendationSessionDocument } from "../../models/recommendation-session.model.js";
import { ReviewModel } from "../../models/review.model.js";
import { TripPlanModel } from "../../models/trip-plan.model.js";
import { UserInteractionModel } from "../../models/user-interaction.model.js";
import { UserModel, type TravelPreferences } from "../../models/user.model.js";
import { AppError } from "../../utils/app-error.js";
import type { RecommendationRefinementInput } from "../../validations/recommendation.validation.js";
import { GroqProvider } from "../llm/groq.provider.js";
import { InvalidLLMResponseError, type LLMProvider } from "../llm/llm-provider.js";
import { buildRecommendationMessages } from "./recommendation-prompts.js";

type Candidate = Pick<Experience, "title" | "slug" | "shortDescription" | "category" | "location" | "country" | "price" | "ratingAverage" | "ratingCount" | "imageUrls" | "durationHours"> & { _id: Types.ObjectId };
interface ScoredCandidate { experience: Candidate; baseScore: number; factors: string[] }
const rerankSchema = z.object({ summary: z.string().min(10).max(1_000), recommendations: z.array(z.object({ experienceId: z.string(), score: z.number().min(0).max(100), reason: z.string().min(5).max(500) }).strict()).min(1).max(12) }).strict();
const jsonSchema: Record<string, unknown> = { type: "object", additionalProperties: false, required: ["summary", "recommendations"], properties: { summary: { type: "string" }, recommendations: { type: "array", items: { type: "object", additionalProperties: false, required: ["experienceId", "score", "reason"], properties: { experienceId: { type: "string" }, score: { type: "number" }, reason: { type: "string" } } } } } };
const includes = (values: string[], value: string) => values.some((entry) => value.toLowerCase().includes(entry.toLowerCase()) || entry.toLowerCase().includes(value.toLowerCase()));
const feedbackWeight: Record<RecommendationFeedbackValue, number> = { interested: 16, not_interested: -35, saved: 22, opened: 6 };

const getSignals = async (userId: string) => {
  const [user, favorites, interactions, reviews, plans, feedback] = await Promise.all([
    UserModel.findById(userId).select("travelPreferences"), FavoriteModel.find({ user: userId }).select("experience").lean(),
    UserInteractionModel.find({ user: userId }).select("experience type metadata").sort({ createdAt: -1 }).limit(500).lean(), ReviewModel.find({ user: userId }).select("experience rating").lean(),
    TripPlanModel.find({ user: userId }).select("selectedExperiences").lean(), RecommendationFeedbackModel.find({ user: userId }).lean(),
  ]);
  if (!user) throw new AppError("User not found", 404);
  const signalIds = new Set<string>();
  favorites.forEach((row) => signalIds.add(row.experience.toString())); interactions.forEach((row) => signalIds.add(row.experience.toString())); reviews.forEach((row) => signalIds.add(row.experience.toString())); plans.flatMap((plan) => plan.selectedExperiences).forEach((id) => signalIds.add(id.toString())); feedback.forEach((row) => signalIds.add(row.experience.toString()));
  const signalExperiences = await ExperienceModel.find({ _id: { $in: [...signalIds] } }).select("category location country").lean();
  const affinityCategories = signalExperiences.map((row) => row.category); const affinityLocations = signalExperiences.flatMap((row) => [row.location, row.country]);
  return { preferences: user.travelPreferences, favorites, interactions, reviews, plans, feedback, affinityCategories, affinityLocations, signalCount: favorites.length + interactions.length + reviews.length + plans.length + feedback.length };
};

const createCandidates = async (signals: Awaited<ReturnType<typeof getSignals>>, refinement: RecommendationRefinementInput): Promise<ScoredCandidate[]> => {
  const query: Record<string, unknown> = { status: "published" };
  if (refinement.category) query.category = new RegExp(refinement.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (refinement.destination) query.$or = ["location", "country"].map((field) => ({ [field]: new RegExp(refinement.destination!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }));
  if (refinement.maximumPrice !== undefined) query.price = { $lte: refinement.maximumPrice };
  if (refinement.minimumRating !== undefined) query.ratingAverage = { $gte: refinement.minimumRating };
  const candidates = await ExperienceModel.find(query).select("title slug shortDescription category location country price ratingAverage ratingCount imageUrls durationHours").limit(200).lean<Candidate[]>();
  const favoriteIds = new Set(signals.favorites.map((row) => row.experience.toString())); const itineraryIds = new Set(signals.plans.flatMap((row) => row.selectedExperiences.map(String)));
  const interactions = new Map<string, number>(); signals.interactions.forEach((row) => interactions.set(row.experience.toString(), (interactions.get(row.experience.toString()) ?? 0) + ({ view: 2, favorite: 9, unfavorite: -8, recommendation_click: 5, itinerary_add: 10, rating: typeof row.metadata.rating === "number" ? row.metadata.rating * 2 : 4 }[row.type])));
  const ratings = new Map(signals.reviews.map((row) => [row.experience.toString(), row.rating])); const feedback = new Map<string, number>(); signals.feedback.forEach((row) => { const id = row.experience.toString(); feedback.set(id, Math.max(-40, Math.min(30, (feedback.get(id) ?? 0) + feedbackWeight[row.value]))); });
  return candidates.map((experience) => { let score = 20 + experience.ratingAverage * 5; const factors: string[] = [`Community rating ${experience.ratingAverage.toFixed(1)}`]; const preferences = signals.preferences;
    if (includes(preferences.preferredCategories, experience.category)) { score += 18; factors.push("Preferred category"); }
    if (includes(preferences.preferredLocations, experience.location) || includes(preferences.preferredLocations, experience.country)) { score += 18; factors.push("Preferred location"); }
    if (includes(signals.affinityCategories, experience.category)) { score += 10; factors.push("Similar to your activity"); }
    if (includes(signals.affinityLocations, experience.location) || includes(signals.affinityLocations, experience.country)) { score += 8; factors.push("Location affinity"); }
    if ((preferences.budgetMin === undefined || experience.price >= preferences.budgetMin) && (preferences.budgetMax === undefined || experience.price <= preferences.budgetMax)) { score += 10; factors.push("Within preferred budget"); }
    if (refinement.travelStyle && `${experience.title} ${experience.shortDescription} ${experience.category}`.toLowerCase().includes(refinement.travelStyle.toLowerCase())) { score += 8; factors.push("Matches requested style"); }
    const id = experience._id.toString(); score += interactions.get(id) ?? 0; score += feedback.get(id) ?? 0; if (favoriteIds.has(id)) { score += 12; factors.push("Previously saved"); } if (itineraryIds.has(id)) { score += 8; factors.push("Used in an itinerary"); } if ((ratings.get(id) ?? 0) >= 4) { score += 12; factors.push("You rated it highly"); }
    return { experience, baseScore: Math.max(0, Math.min(100, Math.round(score))), factors: factors.slice(0, 4) }; }).sort((a, b) => b.baseScore - a.baseScore).slice(0, 20);
};

const rerank = async (provider: LLMProvider, scored: ScoredCandidate[], context: Record<string, unknown>) => {
  const messages = buildRecommendationMessages({ userContext: context, candidates: scored.map(({ experience, baseScore, factors }) => ({ id: experience._id.toString(), title: experience.title, category: experience.category, location: experience.location, country: experience.country, price: experience.price, rating: experience.ratingAverage, description: experience.shortDescription, baseScore, scoreFactors: factors })) });
  for (let attempt = 0; attempt < 2; attempt += 1) { try { return rerankSchema.parse(await provider.generateStructured({ messages: attempt === 0 ? messages : [...messages, { role: "user", content: "Correct the previous response to match the schema exactly and use only supplied candidate IDs." }], schemaName: "recommendations", jsonSchema })); } catch (error) { if (error instanceof AppError) throw error; if (!(error instanceof z.ZodError || error instanceof InvalidLLMResponseError) || attempt === 1) throw new AppError("The AI returned invalid recommendations", 502); } }
  throw new AppError("The AI returned invalid recommendations", 502);
};

export const recommendationService = {
  async generate(userId: string, refinement: RecommendationRefinementInput = {}, provider: LLMProvider = new GroqProvider()) {
    const signals = await getSignals(userId); const preferences = signals.preferences;
    const insufficient = signals.signalCount < 2 && preferences.preferredCategories.length === 0 && preferences.preferredLocations.length === 0;
    if (insufficient) return { needsOnboarding: true, explanation: "Add a few travel preferences to help RouteMuse find meaningful matches.", sessionId: null, recommendations: [] };
    const scored = await createCandidates(signals, refinement); if (scored.length === 0) return { needsOnboarding: false, explanation: "No published experiences match these refinements yet.", sessionId: null, recommendations: [] };
    const context = { preferredCategories: preferences.preferredCategories, preferredLocations: preferences.preferredLocations, budgetRange: { minimum: preferences.budgetMin, maximum: preferences.budgetMax }, travelStyle: refinement.travelStyle ?? preferences.travelStyle, refinement, signalSummary: { favorites: signals.favorites.length, interactions: signals.interactions.length, ratings: signals.reviews.length, savedItineraries: signals.plans.length } };
    const output = await rerank(provider, scored, context); const allowed = new Map(scored.map((row) => [row.experience._id.toString(), row]));
    const ranked = output.recommendations.flatMap((entry) => { const row = allowed.get(entry.experienceId); return row ? [{ experience: row.experience._id, baseScore: row.baseScore, matchScore: Math.round(row.baseScore * 0.55 + entry.score * 0.45), reason: entry.reason, scoreFactors: row.factors }] : []; }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 12);
    if (ranked.length === 0) throw new AppError("The AI did not return usable recommendations", 502);
    const storedRefinement = Object.fromEntries(Object.entries(refinement).filter((entry) => entry[1] !== undefined));
    const session: RecommendationSessionDocument = await RecommendationSessionModel.create({ user: userId, contextSummary: output.summary, refinement: storedRefinement, recommendations: ranked });
    await session.populate("recommendations.experience", "title slug shortDescription category location country price ratingAverage ratingCount imageUrls durationHours");
    return { needsOnboarding: false, explanation: output.summary, sessionId: session.id, recommendations: session.recommendations };
  },
  async feedback(userId: string, experienceId: string, value: RecommendationFeedbackValue) { const experience = await ExperienceModel.exists({ _id: experienceId, status: "published" }); if (!experience) throw new AppError("Experience not found", 404); await RecommendationFeedbackModel.create({ user: userId, experience: experienceId, value }); if (value === "opened") await UserInteractionModel.create({ user: userId, experience: experienceId, type: "recommendation_click", metadata: {} }); },
  async updatePreferences(userId: string, preferences: TravelPreferences) { const user = await UserModel.findByIdAndUpdate(userId, { travelPreferences: preferences }, { new: true, runValidators: true }); if (!user) throw new AppError("User not found", 404); return user.travelPreferences; },
};
