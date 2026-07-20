import { Types } from "mongoose";
import { z } from "zod";
import { AIConversationModel } from "../../models/planner-message.model.js";
import { ExperienceModel, type Experience } from "../../models/experience.model.js";
import { TripPlanModel, type TripPlanDocument } from "../../models/trip-plan.model.js";
import { AppError } from "../../utils/app-error.js";
import type { CreateTripPlanInput } from "../../validations/trip-plan.validation.js";
import { GroqProvider } from "../llm/groq.provider.js";
import { InvalidLLMResponseError, type LLMProvider } from "../llm/llm-provider.js";
import { buildPlannerMessages } from "./planner-prompts.js";

const itemSchema = z.object({ time: z.string().min(1).max(20), title: z.string().min(1).max(140), description: z.string().min(1).max(500), location: z.string().min(1).max(140), experienceId: z.string().nullable(), durationHours: z.number().min(0).max(24), estimatedCost: z.number().min(0).max(10_000_000) }).strict();
const outputSchema = z.object({ title: z.string().min(3).max(140), agentExplanation: z.string().min(10).max(2_000), days: z.array(z.object({ dayNumber: z.number().int().positive(), date: z.iso.date(), title: z.string().min(1).max(140), summary: z.string().min(1).max(500), items: z.array(itemSchema).max(12) }).strict()).min(1).max(31) }).strict();
const jsonSchema: Record<string, unknown> = { type: "object", additionalProperties: false, required: ["title", "agentExplanation", "days"], properties: { title: { type: "string" }, agentExplanation: { type: "string" }, days: { type: "array", items: { type: "object", additionalProperties: false, required: ["dayNumber", "date", "title", "summary", "items"], properties: { dayNumber: { type: "integer" }, date: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, items: { type: "array", items: { type: "object", additionalProperties: false, required: ["time", "title", "description", "location", "experienceId", "durationHours", "estimatedCost"], properties: { time: { type: "string" }, title: { type: "string" }, description: { type: "string" }, location: { type: "string" }, experienceId: { type: ["string", "null"] }, durationHours: { type: "number" }, estimatedCost: { type: "number" } } } } } } } } };

type Candidate = Pick<Experience, "title" | "slug" | "category" | "location" | "country" | "price" | "durationHours" | "ratingAverage" | "shortDescription"> & { _id: Types.ObjectId };
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCandidates = async (input: CreateTripPlanInput): Promise<Candidate[]> => {
  const destination = new RegExp(escapeRegex(input.destination), "i");
  const interests = input.interests.map((value) => new RegExp(escapeRegex(value), "i"));
  const rows = await ExperienceModel.find({ status: "published", availableFrom: { $lte: new Date(input.endDate) }, availableTo: { $gte: new Date(input.startDate) }, $or: [{ location: destination }, { country: destination }, { category: { $in: interests } }] })
    .select("title slug category location country price durationHours ratingAverage shortDescription").limit(40).lean<Candidate[]>();
  const needle = input.destination.toLowerCase();
  return rows.sort((a, b) => {
    const score = (item: Candidate) => (item.location.toLowerCase().includes(needle) || item.country.toLowerCase().includes(needle) ? 8 : 0) + (input.interests.some((interest) => item.category.toLowerCase().includes(interest.toLowerCase())) ? 5 : 0) + item.ratingAverage + (item.price * input.groupSize <= input.budget ? 2 : 0);
    return score(b) - score(a);
  }).slice(0, 12);
};

const generateValid = async (provider: LLMProvider, messages: ReturnType<typeof buildPlannerMessages>) => {
  let current = messages;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { return outputSchema.parse(await provider.generateStructured({ messages: current, schemaName: "trip_plan", jsonSchema })); }
    catch (error) {
      if (error instanceof AppError) throw error;
      if (!(error instanceof z.ZodError || error instanceof InvalidLLMResponseError) || attempt === 1) throw new AppError("The AI returned an invalid itinerary", 502);
      current = [...messages, { role: "user", content: "The prior output failed schema validation. Return a corrected response matching the schema exactly." }];
    }
  }
  throw new AppError("The AI returned an invalid itinerary", 502);
};

const normalizeOutput = (raw: z.infer<typeof outputSchema>, candidates: Candidate[], groupSize: number, startDate: string, endDate: string) => {
  const candidateMap = new Map(candidates.map((candidate) => [candidate._id.toString(), candidate]));
  const selected = new Set<string>();
  const maximumDays = Math.floor((new Date(`${endDate}T00:00:00.000Z`).getTime() - new Date(`${startDate}T00:00:00.000Z`).getTime()) / 86_400_000) + 1;
  const itineraryDays = raw.days.slice(0, maximumDays).map((day, dayIndex) => ({ ...day, date: new Date(new Date(`${startDate}T00:00:00.000Z`).getTime() + dayIndex * 86_400_000).toISOString().slice(0, 10), dayNumber: dayIndex + 1, items: day.items.map((item) => {
    const candidate = item.experienceId ? candidateMap.get(item.experienceId) : undefined;
    if (candidate) selected.add(candidate._id.toString());
    return { time: item.time, title: item.title, description: item.description, location: item.location, durationHours: item.durationHours, ...(candidate ? { experience: candidate._id } : {}), estimatedCost: candidate ? candidate.price * groupSize : item.estimatedCost };
  }) }));
  const estimatedTotal = itineraryDays.reduce((total, day) => total + day.items.reduce((sum, item) => sum + item.estimatedCost, 0), 0);
  return { title: raw.title, agentExplanation: raw.agentExplanation, itineraryDays, selectedExperiences: [...selected].map((id) => new Types.ObjectId(id)), estimatedTotal: Math.round(estimatedTotal * 100) / 100 };
};

const populatePlan = (plan: TripPlanDocument) => plan.populate("selectedExperiences", "title slug location country imageUrls price");

export const tripPlannerService = {
  async create(userId: string, input: CreateTripPlanInput, provider: LLMProvider = new GroqProvider()) {
    const candidates = await getCandidates(input);
    const context = candidates.map((item) => ({ id: item._id.toString(), title: item.title, slug: item.slug, category: item.category, location: item.location, country: item.country, pricePerPerson: item.price, durationHours: item.durationHours, rating: item.ratingAverage, description: item.shortDescription }));
    const raw = await generateValid(provider, buildPlannerMessages({ ...input, experienceCatalog: context }));
    const normalized = normalizeOutput(raw, candidates, input.groupSize, input.startDate, input.endDate);
    const { title: requestedTitle, ...requestFields } = input;
    const plan: TripPlanDocument = await TripPlanModel.create({ user: userId, ...requestFields, ...normalized, title: requestedTitle ?? normalized.title });
    const tripPlanId = plan._id;
    const conversation = await AIConversationModel.create({ user: userId, tripPlan: tripPlanId, messages: [{ role: "user", content: `Plan a ${input.travelStyle} trip to ${input.destination} for ${input.groupSize}.` }, { role: "assistant", content: normalized.agentExplanation }] });
    return { plan: await populatePlan(plan), conversation };
  },
  async refine(userId: string, id: string, instruction: string, provider: LLMProvider = new GroqProvider()) {
    const plan = await TripPlanModel.findOne({ _id: id, user: userId });
    if (!plan) throw new AppError("Trip plan not found", 404);
    const input: CreateTripPlanInput = { title: plan.title, destination: plan.destination, startDate: plan.startDate.toISOString().slice(0, 10), endDate: plan.endDate.toISOString().slice(0, 10), budget: plan.budget, groupSize: plan.groupSize, travelStyle: plan.travelStyle, interests: plan.interests };
    const candidates = await getCandidates(input);
    const context = candidates.map((item) => ({ id: item._id.toString(), title: item.title, category: item.category, location: item.location, country: item.country, pricePerPerson: item.price, durationHours: item.durationHours, rating: item.ratingAverage, description: item.shortDescription }));
    const previous = { title: plan.title, explanation: plan.agentExplanation, days: plan.itineraryDays };
    const raw = await generateValid(provider, buildPlannerMessages({ ...input, experienceCatalog: context }, previous, instruction));
    const normalized = normalizeOutput(raw, candidates, plan.groupSize, input.startDate, input.endDate);
    plan.set(normalized); await plan.save();
    const conversation = await AIConversationModel.findOneAndUpdate({ tripPlan: plan._id }, { $push: { messages: { $each: [{ role: "user", content: instruction, createdAt: new Date() }, { role: "assistant", content: normalized.agentExplanation, createdAt: new Date() }] } } }, { new: true });
    return { plan: await populatePlan(plan), conversation };
  },
  async list(userId: string) { return TripPlanModel.find({ user: userId }).select("title destination startDate endDate estimatedTotal createdAt").sort({ createdAt: -1 }).lean(); },
  async get(userId: string, id: string) { const plan = await TripPlanModel.findOne({ _id: id, user: userId }).populate("selectedExperiences", "title slug location country imageUrls price"); if (!plan) throw new AppError("Trip plan not found", 404); return { plan, conversation: await AIConversationModel.findOne({ tripPlan: id }).lean() }; },
  async remove(userId: string, id: string) { const plan = await TripPlanModel.findOneAndDelete({ _id: id, user: userId }); if (!plan) throw new AppError("Trip plan not found", 404); await AIConversationModel.deleteOne({ tripPlan: id }); },
};
