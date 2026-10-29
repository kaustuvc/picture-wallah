/// <reference types="node" />
import { defineConfig } from "drizzle-kit";
import { env } from "./src/app/common/config/env.js";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL!,
  },
});
