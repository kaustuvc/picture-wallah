import { type Request, type Response, type NextFunction } from "express";
import { AuthService } from "./auth.service.js";
import ApiResponse from "../../common/utils/ApiResponse.js";
import ApiError from "../../common/utils/ApiError.js";
import { env } from "../../common/config/env.js";
import RegisterDto from "./dtos/register.dto.js";
import LoginDto from "./dtos/login.dto.js";
import ForgotDto from "./dtos/forgot.dto.js";
import ResetDto from "./dtos/reset.dto.js";

// Shared options object so setRefreshCookie and clearRefreshCookie
// can never drift out of sync — browsers ignore clearCookie if
// the attributes don't exactly match what was set.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "strict" as const,           // Prevents CSRF attacks
  maxAge: 7 * 24 * 60 * 60 * 1000,      // 7 days — must match REFRESH_TOKEN_TTL_MS in auth.service.ts
};

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, REFRESH_COOKIE_OPTIONS);
};

const clearRefreshCookie = (res: Response) => {
  // maxAge is not needed (and misleading) when clearing — omit it
  const { maxAge: _, ...clearOptions } = REFRESH_COOKIE_OPTIONS;
  res.clearCookie("refreshToken", clearOptions);
};

export class AuthController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validatedData = RegisterDto.registerSchema.parse(req.body);
      const { user, accessToken, refreshToken } =
        await AuthService.register(validatedData);

      setRefreshCookie(res, refreshToken);
      ApiResponse.created(res, "User registered successfully", { user, accessToken });
    } catch (error) {
      next(error);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validatedData = LoginDto.loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } =
        await AuthService.login(validatedData);

      setRefreshCookie(res, refreshToken);
      ApiResponse.ok(res, "Login successful", { user, accessToken });
    } catch (error) {
      next(error);
    }
  }

  // FIX: Also calls AuthService.logout to delete the token from the DB.
  // Clearing the cookie alone is not enough — the token hash would remain
  // in refresh_tokens and could still be used by anyone who captured it.
  static async logout(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken as string | undefined;
      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      clearRefreshCookie(res);
      ApiResponse.ok(res, "Logged out successfully");
    } catch (error) {
      next(error);
    }
  }

  static async refresh(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken as string | undefined;
      if (!refreshToken) {
        throw ApiError.unauthorized("Refresh token is missing");
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await AuthService.refreshAccess(refreshToken);

      setRefreshCookie(res, newRefreshToken);
      ApiResponse.ok(res, "Access token refreshed successfully", { accessToken });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validatedData = ForgotDto.forgotPasswordSchema.parse(req.body);
      const { message, ...data } = await AuthService.forgotPassword(validatedData);

      // Forward whatever the service returned (mockEmailContent in non-prod,
      // nothing in prod) — controller doesn't need to know the shape
      ApiResponse.ok(res, message, Object.keys(data).length ? data : null);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validatedData = ResetDto.resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(validatedData);

      ApiResponse.ok(res, result.message);
    } catch (error) {
      next(error);
    }
  }
}
