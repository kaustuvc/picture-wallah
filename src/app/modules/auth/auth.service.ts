import bcrypt from "bcrypt";
import crypto from "crypto";
import { AuthRepository } from "./auth.model.js";
import ApiError from "../../common/utils/ApiError.js";
import { env } from "../../common/config/env.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";
import { type RegisterType } from "./dtos/register.dto.js";
import { type LoginType } from "./dtos/login.dto.js";
import { type ForgotType } from "./dtos/forgot.dto.js";
import { type ResetType } from "./dtos/reset.dto.js";

const SALT_ROUNDS = 10;

// SHA-256 is appropriate here (not bcrypt) because refresh tokens are already
// high-entropy random strings — bcrypt's slowness buys nothing and costs
// performance on every authenticated request.
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Must match the refresh token expiry set in generateRefreshToken()
// so the DB row and the JWT expire at the same time.
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}

export class AuthService {
  static async register(data: RegisterType) {
    const existingUser = await AuthRepository.findByEmail(data.email);
    if (existingUser) {
      throw ApiError.conflict("A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const newUser = await AuthRepository.createUser(data, hashedPassword);

    const accessToken = generateAccessToken({ userId: newUser.id });
    const refreshToken = generateRefreshToken({ userId: newUser.id });

    await AuthRepository.saveRefreshToken(
      newUser.id,
      hashToken(refreshToken),
      refreshTokenExpiresAt()
    );

    const safeUser = { id: newUser.id, name: newUser.name, email: newUser.email };
    return { user: safeUser, accessToken, refreshToken };
  }

  static async login(data: LoginType) {
    const user = await AuthRepository.findByEmail(data.email);

    // Same error message for both "user not found" and "wrong password" —
    // prevents user enumeration attacks (attacker can't tell which one failed)
    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await AuthRepository.saveRefreshToken(
      user.id,
      hashToken(refreshToken),
      refreshTokenExpiresAt()
    );

    // Explicitly strip sensitive fields before returning user data
    const safeUser = { id: user.id, name: user.name, email: user.email };
    return { user: safeUser, accessToken, refreshToken };
  }

  static async refreshAccess(token: string) {
    // 1. Verify the refresh token signature and expiry (throws if invalid)
    const decoded = verifyRefreshToken(token);

    // 2. Verify the token actually exists in the DB — catches revoked tokens
    //    that are still within their expiry window
    const tokenHash = hashToken(token);
    const storedToken = await AuthRepository.findRefreshTokenByHash(tokenHash);
    if (!storedToken) {
      throw ApiError.unauthorized("Refresh token has been revoked");
    }

    // 3. Ensure user still exists
    const user = await AuthRepository.findById(decoded.userId);
    if (!user) {
      throw ApiError.unauthorized("User no longer exists");
    }

    // 4. Token rotation: delete the old token, issue and persist new ones
    //    so the old refresh token can't be reused even if intercepted
    await AuthRepository.deleteRefreshToken(tokenHash);

    const newAccessToken = generateAccessToken({ userId: user.id });
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    await AuthRepository.saveRefreshToken(
      user.id,
      hashToken(newRefreshToken),
      refreshTokenExpiresAt()
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // Logout is possible because refresh tokens are persisted in the DB.
  // Access token expires naturally — keep it short-lived (15 min) to
  // minimise the window where a stolen access token remains valid.
  static async logout(token: string) {
    const tokenHash = hashToken(token);
    await AuthRepository.deleteRefreshToken(tokenHash);
  }

  static async forgotPassword(data: ForgotType) {
    const user = await AuthRepository.findByEmail(data.email);

    if (!user) {
      // Don't reveal whether the email exists
      return {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      };
    }

    const { rawToken, hashedToken, resetTokenExpiresAt } = generateResetToken();
    await AuthRepository.updateResetToken(user.id, hashedToken, resetTokenExpiresAt);

    return {
      message:
        "If an account with that email exists, a password reset link has been sent.",
      // Guard mock content from leaking into production
      ...(env.NODE_ENV !== "production" && {
        mockEmailContent: `Click here to reset: ${env.APP_URL}/reset?token=${rawToken}`,
      }),
    };
  }

  static async resetPassword(data: ResetType) {
    const hashedToken = crypto.createHash("sha256").update(data.token).digest("hex");

    const user = await AuthRepository.findByResetToken(hashedToken);
    if (!user) {
      throw ApiError.badRequest("Invalid or expired password reset token");
    }

    const newHashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
    await AuthRepository.updatePasswordAndClearToken(user.id, newHashedPassword);

    // Invalidate all active sessions after a password reset —
    // anyone who had a valid refresh token before the reset is now logged out
    await AuthRepository.deleteAllRefreshTokens(user.id);

    return { message: "Password has been successfully reset. You can now log in." };
  }
}
