import { HttpStatus } from "../constants/httpStatus.js";
class ApiError extends Error {
    statusCode: number
    isOperational: boolean
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = "Bad request"): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, message);
  }

  static unauthorized(message: string = "Unauthorized"): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, message);
  }

  static forbidden(message: string = "Forbidden"): ApiError {
    return new ApiError(HttpStatus.FORBIDDEN, message);
  }

  static notFound(message: string = "Not found"): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, message);
  }

  static conflict(message: string = "Conflict"): ApiError {
    return new ApiError(HttpStatus.CONFLICT, message);
  }

  static unprocessable(message: string = "Unprocessable entity"): ApiError {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, message);
  }

  // Added a 500 helper for database or server failures
  static internal(message: string = "Internal Server Error"): ApiError {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message);
  }
}

export default ApiError;
