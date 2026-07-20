import { Types } from "mongoose";
import { ExperienceModel } from "../models/experience.model.js";
import { FavoriteModel } from "../models/favorite.model.js";
import { ReviewModel } from "../models/review.model.js";
import { TripPlanModel } from "../models/trip-plan.model.js";
import { UserInteractionModel } from "../models/user-interaction.model.js";

interface TotalResult { _id: null; total: number }
interface CategoryResult { _id: string; count: number }
interface MonthResult { _id: string; plans: number; estimatedSpending: number }

export const getDashboardSummary = async (userId: string) => {
  const user = new Types.ObjectId(userId); const now = new Date(); const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const [experiencesCreated, favorites, reviewsSubmitted, planTotals, categoryDistribution, recentInteractions, monthlyRaw, recentPlans, recentFavorites] = await Promise.all([
    ExperienceModel.countDocuments({ creator: user }), FavoriteModel.countDocuments({ user }), ReviewModel.countDocuments({ user }),
    TripPlanModel.aggregate<TotalResult>([{ $match: { user } }, { $group: { _id: null, total: { $sum: "$estimatedTotal" } } }]),
    UserInteractionModel.aggregate<CategoryResult>([{ $match: { user } }, { $lookup: { from: "experiences", localField: "experience", foreignField: "_id", as: "experienceData" } }, { $unwind: "$experienceData" }, { $group: { _id: "$experienceData.category", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    UserInteractionModel.find({ user }).sort({ createdAt: -1 }).limit(8).populate("experience", "title slug category imageUrls location").lean(),
    TripPlanModel.aggregate<MonthResult>([{ $match: { user, createdAt: { $gte: start } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, plans: { $sum: 1 }, estimatedSpending: { $sum: "$estimatedTotal" } } }, { $sort: { _id: 1 } }]),
    TripPlanModel.find({ user }).select("title destination startDate endDate estimatedTotal createdAt").sort({ createdAt: -1 }).limit(4).lean(),
    FavoriteModel.find({ user }).sort({ createdAt: -1 }).limit(4).populate("experience", "title slug location country imageUrls price ratingAverage").lean(),
  ]);
  const monthMap = new Map(monthlyRaw.map((row) => [row._id, row])); const monthlyPlanningActivity = Array.from({ length: 12 }, (_, offset) => { const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + offset, 1)); const key = date.toISOString().slice(0, 7); const row = monthMap.get(key); return { month: date.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }), plans: row?.plans ?? 0, estimatedSpending: row?.estimatedSpending ?? 0 }; });
  return { statistics: { experiencesCreated, favorites, reviewsSubmitted, aiPlansGenerated: monthlyRaw.reduce((sum, row) => sum + row.plans, 0) + await TripPlanModel.countDocuments({ user, createdAt: { $lt: start } }), estimatedPlanSpending: planTotals[0]?.total ?? 0 }, categoryInteractionDistribution: categoryDistribution.map((row) => ({ category: row._id, count: row.count })), recentInteractions, monthlyPlanningActivity, recentPlans, recentSavedExperiences: recentFavorites };
};
