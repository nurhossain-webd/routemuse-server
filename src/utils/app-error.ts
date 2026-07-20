export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly details: unknown;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
