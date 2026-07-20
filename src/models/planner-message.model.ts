import { Schema, model, type Types } from "mongoose";

export interface PlannerMessage { role: "user" | "assistant"; content: string; createdAt: Date }
export interface AIConversation { user: Types.ObjectId; tripPlan: Types.ObjectId; messages: PlannerMessage[]; createdAt: Date; updatedAt: Date }

const messageSchema = new Schema<PlannerMessage>({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, maxlength: 4_000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const conversationSchema = new Schema<AIConversation>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tripPlan: { type: Schema.Types.ObjectId, ref: "TripPlan", required: true, unique: true },
  messages: { type: [messageSchema], default: [] },
}, { timestamps: true, versionKey: false });

export const AIConversationModel = model<AIConversation>("AIConversation", conversationSchema);
