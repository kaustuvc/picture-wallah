import express, { type Application, type Request, type Response } from "express";
import path from "node:path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./common/middleware/error.middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { env } from "./common/config/env.js";

export function createApplication(): Application {
  const app = express();

  // Trust only the first proxy hop (e.g. nginx, Railway, Render).
  // `true` would trust the entire X-Forwarded-For chain, allowing clients
  // to spoof their IP and bypass rate limiting.
  app.set("trust proxy", 1);

  // ── Global middleware ──────────────────────────────────────────────────────

  app.use(
    cors({
      origin: env.APP_URL,
      credentials: true, // Required for cookies to be sent cross-origin
    })
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/public", express.static(path.resolve(process.cwd(), "public")));

  // Request logger — must come before routes so it fires on every request
  app.use((req, _res, next) => {
    console.log("REQ:", req.method, req.url);
    next();
  });

  // ── Routes ────────────────────────────────────────────────────────────────

  app.get("/health", (_req: Request, res: Response): void => {
    res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
  });

  app.get("/", (_req: Request, res: Response): void => {
    res.status(200).json({ success: true, message: "Server is running" });
  });

  app.use("/api/auth", authRoutes);

  // 404 handler — must come after all real routes so it only catches
  // requests that didn't match anything above
  app.use("/api", (_req: Request, res: Response): void => {
    res.status(404).json({ success: false, message: "API route not found" });
  });

  // ── Global error handler ───────────────────────────────────────────────────
  // Must be last — Express identifies error handlers by their 4-argument signature
  app.use(errorHandler);

  return app;
}
