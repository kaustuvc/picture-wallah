import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// Users Table
export const users = pgTable("users", {
  id:       serial("id").primaryKey(),
  name:     varchar("name", { length: 255 }).notNull(),
  email:    varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), // bcrypt hash

  // Only populated during an active password reset flow
  // Note: updatedAt is updated by Drizzle ORM only — not enforced at DB level.
  // Raw SQL updates will not trigger this automatically.
  resetToken:          varchar("reset_token", { length: 64 }),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdateFn(() => new Date()),
});

// Refresh Tokens Table
// One row per active session — supports multiple sessions per user.
// Cascade delete ensures tokens are cleaned up if the user is hard-deleted.
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id:        serial("id").primaryKey(),
    userId:    integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // SHA-256 hex is always 64 chars
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Needed for deleteAllRefreshTokens(userId) — without this,
    // DELETE WHERE userId = ? is a full table scan
    index("refresh_tokens_user_id_idx").on(table.userId),
  ]
);
