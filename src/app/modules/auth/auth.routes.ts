import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "./auth.controller.js";

const router = Router();

// Strict limiter for sensitive auth actions (login, register, password flows).
// Keep max low — these endpoints are the primary brute-force targets.
// NOTE: For this to correctly identify client IPs behind a proxy (nginx,
// Railway, Render, etc.), set `app.set("trust proxy", 1)` in app.ts.
// Without it, all requests appear to come from the same IP and rate limiting
// is trivially bypassed.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: "Too many attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
});

// Looser limiter for token operations — these are called more frequently
// by legitimate clients (e.g. refresh on every page load) but should still
// be protected against stuffing attacks.
const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Credential & password routes — strict limit
router.post("/register", authLimiter, AuthController.register);
router.post("/login", authLimiter, AuthController.login);
router.post("/forgot-password", authLimiter, AuthController.forgotPassword);
router.post("/reset-password", authLimiter, AuthController.resetPassword);

// Token routes — looser limit (still protected against abuse)
router.post("/refresh", tokenLimiter, AuthController.refresh);
router.post("/logout", tokenLimiter, AuthController.logout);

export const authRoutes = router;
