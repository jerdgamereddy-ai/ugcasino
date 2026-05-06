import { pgTable, text, serial, integer, boolean, timestamp, varchar, doublePrecision, customType } from "drizzle-orm/pg-core";
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
  profitSharePercentage: doublePrecision("profit_share_percentage").default(0).notNull(),
  phoneNumber: text("phone_number"),
  withdrawCode: text("withdraw_code"),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow(),
  // Per-manager casino pool (only meaningful for role='manager').
  // When useSeparateBusinessMoney=false (default), the manager's regular
  // balance acts as the casino bankroll for their players: bets credit it,
  // wins debit it. When true, businessMoney becomes the dedicated bankroll
  // and the manager's wallet `balance` is left alone.
  businessMoney: integer("business_money").default(0).notNull(),
  useSeparateBusinessMoney: boolean("use_separate_business_money").default(false).notNull(),
  // Per-manager "reports start from" cutoff. Reporting endpoints filter out
  // any activity dated before this timestamp for that manager's players.
  // Null means "show everything" (default).
  reportSinceAt: timestamp("report_since_at"),
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
  type: text("type", { enum: ["deposit", "withdrawal", "bet", "win", "voucher_redemption", "manager_credit", "manager_withdraw_profits", "business_money_adjust"] }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameSettings = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  gameType: text("game_type", { enum: ["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "classic-slots", "dog-racing", "horse4", "horse-js", "aviator"] }).notNull().unique(),
  winChance: doublePrecision("win_chance").default(0.3).notNull(),
  minBet: integer("min_bet").default(500).notNull(),
  payoutMultiplier: doublePrecision("payout_multiplier").default(1.95).notNull(),
  extraSettings: text("extra_settings"),
  houseEdgePct: doublePrecision("house_edge_pct").default(5.0).notNull(),
  totalBet: integer("total_bet").default(0).notNull(),
  totalPaid: integer("total_paid").default(0).notNull(),
  highBetThreshold: integer("high_bet_threshold").default(50000).notNull(),
  highBetWagerMultiplier: doublePrecision("high_bet_wager_multiplier").default(5.0).notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  managerCode: text("manager_code"),
  managerId: integer("manager_id"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
});

export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  senderRole: text("sender_role", { enum: ["admin", "super_manager", "manager"] }).notNull(),
  targetRole: text("target_role", { enum: ["super_manager", "manager", "user", "all", "public"] }).notNull(),
  message: text("message").notNull(),
  fontFamily: text("font_family").default("sans-serif"),
  color: text("color").default("#FFD700"),
  scrollSpeed: integer("scroll_speed").default(15),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const broadcastDismissals = pgTable("broadcast_dismissals", {
  id: serial("id").primaryKey(),
  broadcastId: integer("broadcast_id").notNull(),
  userId: integer("user_id").notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// One row per (user, gameType) disabled. The DB additionally enforces a
// UNIQUE(user_id, game_type) constraint (created via migration) so the
// `setGameDisabled` ON CONFLICT clause is safe.
export const userGameDisables = pgTable("user_game_disables", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gameType: text("game_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserGameDisable = typeof userGameDisables.$inferSelect;

// Singleton row (id=1) holding site-wide visual configuration the admin can
// tweak (background color/gradient/image/animation). The DB enforces id=1.
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  bgType: text("bg_type", { enum: ["default", "color", "gradient", "image", "animation"] }).default("default").notNull(),
  bgColor: text("bg_color"),
  bgGradient: text("bg_gradient"),
  bgImageUrl: text("bg_image_url"),
  bgAnimation: text("bg_animation"),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type SiteSettings = typeof siteSettings.$inferSelect;

// Background images uploaded by admins. Stored as bytea like audio so they
// survive Replit deploys (where /uploads is rebuilt from scratch).
export const backgroundImages = pgTable("background_images", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  data: customType<{ data: Buffer; notNull: true }>({ dataType: () => "bytea" })("data"),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type BackgroundImage = typeof backgroundImages.$inferSelect;

// Canonical list of toggleable games. Keep in sync with server route gating
// and with the lobby tile registry. The `id` here matches the `gameType` used
// in /api/games/<id>/* endpoints.
export const GAMES_REGISTRY = [
  { id: "classic-slots", label: "Classic Slots" },
  { id: "roulette",      label: "European Roulette" },
  { id: "dice",          label: "Royal Dice" },
  { id: "hilo",          label: "High-Low Cards" },
  { id: "coinflip",      label: "Double or Nothing" },
  { id: "plinko",        label: "Plinko" },
  { id: "wheel",         label: "Wheel of Fortune" },
  { id: "fishhunt",      label: "Fish Joy / Hunt" },
  { id: "fishjoy",       label: "Fish Joy (Iframe)" },
  { id: "dog-racing",    label: "Greyhound Racing" },
  { id: "horse4",        label: "Horse Racing" },
  { id: "horse-js",      label: "Quick Horse Race" },
  { id: "aviator",       label: "Aviator" },
] as const;

export type GameId = typeof GAMES_REGISTRY[number]["id"];

export const audioTracks = pgTable("audio_tracks", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  // Binary content stored in DB so audio survives deployments (filesystem
  // uploads are wiped on each deploy build). Nullable for legacy rows.
  data: customType<{ data: Buffer; notNull: false; default: false }>({
    dataType() { return "bytea"; },
  })("data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AudioTrack = typeof audioTracks.$inferSelect;
export type InsertAudioTrack = typeof audioTracks.$inferInsert;

// Automated odds/multiplier scheduling. Each row is a rule: between
// `startTime` and `endTime` (24h "HH:MM" strings, server-local time),
// optionally restricted to specific weekdays, the named gameType's
// `winChance` and/or `payoutMultiplier` are forced to the configured values.
// A background tick (every 60s) reconciles game settings against the
// currently-active rules so admin doesn't need to edit anything by hand.
export const gameSchedules = pgTable("game_schedules", {
  id: serial("id").primaryKey(),
  gameType: text("game_type").notNull(),
  label: text("label").notNull(),
  startTime: text("start_time").notNull(),                    // "HH:MM"
  endTime: text("end_time").notNull(),                        // "HH:MM"
  daysOfWeek: text("days_of_week").default("0,1,2,3,4,5,6").notNull(), // CSV of 0(Sun)..6(Sat)
  winChancePct: doublePrecision("win_chance_pct"),            // 0..100, optional
  payoutMultiplier: doublePrecision("payout_multiplier"),     // 1.01..100, optional
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type GameSchedule = typeof gameSchedules.$inferSelect;
export const insertGameScheduleSchema = createInsertSchema(gameSchedules).omit({ id: true, createdAt: true, createdBy: true });
export type InsertGameSchedule = z.infer<typeof insertGameScheduleSchema>;

// Singleton row (id=1) holding the global "Universal House Edge" config.
// When `enabled=true`, ALL games consult this single house-edge configuration
// instead of their per-game houseEdgePct / totalBet / totalPaid stats. Wins
// are also blocked whenever the combined house bankroll (admin + super
// managers + managers) would drop below `minHouseBalance`.
export const universalHouseEdge = pgTable("universal_house_edge", {
  id: integer("id").primaryKey().default(1),
  enabled: boolean("enabled").default(false).notNull(),
  houseEdgePct: doublePrecision("house_edge_pct").default(5.0).notNull(),
  minHouseBalance: integer("min_house_balance").default(0).notNull(),
  totalBet: integer("total_bet").default(0).notNull(),
  totalPaid: integer("total_paid").default(0).notNull(),
  bypassClassicSlotsBankroll: boolean("bypass_classic_slots_bankroll").default(false).notNull(),
  bypassHorse4Bankroll: boolean("bypass_horse4_bankroll").default(false).notNull(),
  bypassDogRacingBankroll: boolean("bypass_dog_racing_bankroll").default(false).notNull(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type UniversalHouseEdge = typeof universalHouseEdge.$inferSelect;

export const updateUniversalHouseEdgeSchema = z.object({
  enabled: z.boolean().optional(),
  houseEdgePct: z.number().min(0).max(100).optional(),
  minHouseBalance: z.number().int().min(0).optional(),
  bypassClassicSlotsBankroll: z.boolean().optional(),
  bypassHorse4Bankroll: z.boolean().optional(),
  bypassDogRacingBankroll: z.boolean().optional(),
});
export type UpdateUniversalHouseEdge = z.infer<typeof updateUniversalHouseEdgeSchema>;

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

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "message_sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "message_receiver",
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
  gameType: z.enum(["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "classic-slots", "dog-racing", "horse4", "horse-js", "aviator"]),
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

export type Broadcast = typeof broadcasts.$inferSelect;
export type BroadcastDismissal = typeof broadcastDismissals.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const insertBroadcastSchema = createInsertSchema(broadcasts).pick({
  targetRole: true,
  message: true,
});
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;

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
