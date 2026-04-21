import { logger } from "../utils/logger.js";

export const createHttpError = (statusCode, message, details) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.details = details;

  return error;
};

export const errorHandler = (error, _request, response, _next) => {
  logger.error("Unhandled request error", error);

  const statusCode = Number(error.statusCode || 500);
  const message = statusCode >= 500 ? "Internal server error" : error.message;
  const payload = { error: message };

  if (error.details) {
    payload.details = error.details;
  }

  response.status(statusCode).json(payload);
};
