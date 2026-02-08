import { pgTable, text, serial, integer, boolean, timestamp, varchar, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "super_manager", "manager", "user"] }).default("user").notNull(),
  balance: integer("balance").default(0).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSecurityAnswers = pgTable("admin_security_answers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
});

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  amount: integer("amount").notNull(),
  createdBy: integer("created_by").notNull(),
  redeemedBy: integer("redeemed_by"),
  isRedeemed: boolean("is_redeemed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type", { enum: ["deposit", "withdrawal", "bet", "win", "voucher_redemption"] }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameSettings = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  gameType: text("game_type", { enum: ["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "mines", "wheel", "poker"] }).notNull().unique(),
  winChance: doublePrecision("win_chance").default(0.3).notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ one, many }) => ({
  creator: one(users, {
    fields: [users.createdBy],
    references: [users.id],
    relationName: "user_creator",
  }),
  securityAnswers: many(adminSecurityAnswers),
}));

export const adminSecurityAnswersRelations = relations(adminSecurityAnswers, ({ one }) => ({
  user: one(users, {
    fields: [adminSecurityAnswers.userId],
    references: [users.id],
  }),
}));

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
  gameType: z.enum(["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "mines", "wheel", "poker", "keno"]),
  winChance: z.number().min(0).max(100),
});

export const adminPasswordSchema = z.string().min(10).refine(
  (val) => /[A-Z]/.test(val) && /[0-9]/.test(val) && /[^a-zA-Z0-9]/.test(val),
  { message: "Password must be at least 10 characters with uppercase letters, digits, and symbols" }
);

export const ADMIN_SECURITY_QUESTIONS = [
  "What is your village of birth?",
  "What is your grandpa's name?",
  "What is your favourite meal?",
  "Who was your first lover?",
] as const;

export const securityAnswersSchema = z.array(z.object({
  question: z.enum(ADMIN_SECURITY_QUESTIONS),
  answer: z.string().min(1),
})).length(4);

export const securityVerifySchema = z.array(z.object({
  question: z.enum(ADMIN_SECURITY_QUESTIONS),
  answer: z.string().min(1),
})).min(2).max(4);

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).pick({
  amount: true,
});

// === API TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type GameSetting = typeof gameSettings.$inferSelect;
export type AdminSecurityAnswer = typeof adminSecurityAnswers.$inferSelect;

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;

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

export interface ReportsResponse {
  totalDeposits: number;
  totalWithdrawals: number;
  totalBets: number;
  totalWins: number;
  totalPendingBalance: number;
  netRevenue: number;
  playersCount: number;
  dailyStats: {
    date: string;
    bets: number;
    wins: number;
    deposits: number;
  }[];
  transactions: Transaction[];
}
