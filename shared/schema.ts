import { pgTable, text, serial, integer, boolean, timestamp, varchar, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "manager", "user"] }).default("user").notNull(),
  balance: integer("balance").default(0).notNull(), // In UGX
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  amount: integer("amount").notNull(),
  createdBy: integer("created_by").notNull(), // Admin or Manager ID
  redeemedBy: integer("redeemed_by"), // User ID who redeemed it
  isRedeemed: boolean("is_redeemed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // Positive for win/deposit, negative for bet/withdraw
  type: text("type", { enum: ["deposit", "withdrawal", "bet", "win", "voucher_redemption"] }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameSettings = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  gameType: text("game_type", { enum: ["slots", "roulette", "dice", "hilo", "coinflip"] }).notNull().unique(),
  winChance: doublePrecision("win_chance").default(0.3).notNull(), // 0.0 to 1.0 (30% default)
  updatedBy: integer("updated_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  creator: one(users, {
    fields: [vouchers.createdBy],
    references: [users.id],
    relationName: "voucher_creator",
  }),
  redeemer: one(users, {
    fields: [vouchers.redeemedBy],
    references: [users.id],
    relationName: "voucher_redeemer",
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).pick({
  amount: true,
});

export const redeemVoucherSchema = z.object({
  code: z.string().min(1, "Voucher code is required"),
});

export const updateGameSettingsSchema = z.object({
  gameType: z.enum(["slots", "roulette", "dice", "hilo"]),
  winChance: z.number().min(0).max(100), // Percent
});

// === API TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type GameSetting = typeof gameSettings.$inferSelect;

export interface GameResult {
  won: boolean;
  payout: number;
  balance: number;
  details: string;
}

export interface SpinResult extends GameResult {
  reels: [string, string, string];
}

export interface RouletteResult extends GameResult {
  number: number;
  color: 'red' | 'black' | 'green';
}

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
});

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  user: one(users, {
    fields: [withdrawalRequests.userId],
    references: [users.id],
  }),
  processor: one(users, {
    fields: [withdrawalRequests.processedBy],
    references: [users.id],
  }),
}));

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).pick({
  amount: true,
});

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
