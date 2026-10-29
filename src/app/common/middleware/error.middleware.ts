import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import ApiError from "../utils/ApiError.js";

const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === "object" && val !== null;

// Avoids repeating isObject + code checks for each PostgreSQL error code
const isPgError = (err: unknown, code: string): boolean =>
  isObject(err) && err.code === code;

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";

  // 1. Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    // Field paths are intentionally included to aid client-side form validation
    message = err.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");

  // 2. Custom ApiErrors
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    if (statusCode >= 500) console.error("[ApiError 5xx]:", err);

  // 3. Malformed JSON body — Express throws a SyntaxError with status 400
  //    before the request reaches any route handler
  } else if (err instanceof SyntaxError && isObject(err) && err.status === 400) {
    statusCode = 400;
    message = "Malformed JSON in request body";

  // 4. PostgreSQL unique constraint violation
  } else if (isPgError(err, "23505")) {
    statusCode = 409;
    message = "A record with this information already exists.";

  // 5. PostgreSQL foreign key violation
  } else if (isPgError(err, "23503")) {
    statusCode = 400;
    message = "Invalid reference — related record does not exist.";

  // 6. Fallback — log everything that didn't match a known shape
  } else {
    console.error("[Unhandled Error]:", err);
  }

  // Single exit point — response shape can never diverge between branches
  res.status(statusCode).json({ success: false, error: message });
};
