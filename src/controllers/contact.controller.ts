import type { RequestHandler } from "express";
import { ContactMessageModel } from "../models/contact-message.model.js";
import { sendSuccess } from "../utils/api-response.js";
import { contactMessageSchema } from "../validations/contact.validation.js";
export const createContactMessage: RequestHandler = async (request, response) => { const parsed = contactMessageSchema.parse(request.body); const input = { name: parsed.name, email: parsed.email, subject: parsed.subject, message: parsed.message }; await ContactMessageModel.create(input); sendSuccess(response, { message: "Your message has been received", data: null, statusCode: 201 }); };
