import { Schema, model } from "mongoose";
export interface ContactMessage { name: string; email: string; subject: string; message: string; status: "new" | "reviewed"; createdAt: Date; updatedAt: Date }
const schema = new Schema<ContactMessage>({ name: { type: String, required: true, trim: true, maxlength: 80 }, email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 }, subject: { type: String, required: true, trim: true, maxlength: 140 }, message: { type: String, required: true, trim: true, maxlength: 5_000 }, status: { type: String, enum: ["new", "reviewed"], default: "new" } }, { timestamps: true, versionKey: false });
schema.index({ createdAt: -1, status: 1 });
export const ContactMessageModel = model<ContactMessage>("ContactMessage", schema);
