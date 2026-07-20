import type { Response } from "express";

import type { SuccessResponse } from "../types/api-response.js";

interface SendSuccessOptions<T> {
  message: string;
  data: T;
  statusCode?: number;
}

export const sendSuccess = <T>(
  response: Response<SuccessResponse<T>>,
  { message, data, statusCode = 200 }: SendSuccessOptions<T>,
): Response<SuccessResponse<T>> =>
  response.status(statusCode).json({ success: true, message, data });
