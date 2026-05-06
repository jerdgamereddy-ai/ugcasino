import { users, vouchers, transactions, gameSettings, withdrawalRequests, adminSecurityAnswers, broadcasts, broadcastDismissals, messages, audioTracks, userGameDisables, siteSettings, backgroundImages, gameSchedules, universalHouseEdge, managerGameOverrides, type User, type InsertUser, type Voucher, type InsertVoucher, type Transaction, type GameSetting, type WithdrawalRequest, type InsertWithdrawalRequest, type AdminSecurityAnswer, type Broadcast, type BroadcastDismissal, type Message, type AudioTrack, type InsertAudioTrack, type UserGameDisable, type SiteSettings, type BackgroundImage, type GameSchedule, type InsertGameSchedule, type UniversalHouseEdge, type UpdateUniversalHouseEdge, type ManagerGameOverride } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, gte, lte, between } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;
  approveUser(userId: number): Promise<User>;
  updateUserPassword(userId: number, password: string): Promise<User>;
  updateUserRole(userId: number, role: string): Promise<User>;
  updateUsername(userId: number, username: string): Promise<User>;
  suspendUser(userId: number): Promise<User>;
  unsuspendUser(userId: number): Promise<User>;
  deleteUser(userId: number): Promise<void>;
  getUsersByCreator(creatorId: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  setSecurityAnswers(userId: number, answers: { question: string; answer: string }[]): Promise<void>;
  getSecurityAnswers(userId: number): Promise<AdminSecurityAnswer[]>;

  createVoucher(voucher: InsertVoucher & { createdBy: number, code: string }): Promise<Voucher>;
  getVoucherByCode(code: string): Promise<Voucher | undefined>;
  redeemVoucher(voucherId: number, userId: number): Promise<Voucher>;
  getAllVouchers(): Promise<Voucher[]>;

  createTransaction(transaction: { userId: number, amount: number, type: string, description?: string }): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  getTransactionsByUserIds(userIds: number[]): Promise<Transaction[]>;
  getTransactionsByUserIdsAndDateRange(userIds: number[], from?: Date, to?: Date): Promise<Transaction[]>;
  getTransactionsByDateRange(from?: Date, to?: Date): Promise<Transaction[]>;
  getWithdrawalsByUserIds(userIds: number[]): Promise<WithdrawalRequest[]>;
  getWithdrawalsByUserIdsAndDateRange(userIds: number[], from?: Date, to?: Date): Promise<WithdrawalRequest[]>;
  getAllWithdrawalsByDateRange(from?: Date, to?: Date): Promise<WithdrawalRequest[]>;

  getGameSettings(gameType: string): Promise<GameSetting | undefined>;
  getAllGameSettings(): Promise<GameSetting[]>;
  updateGameSettings(gameType: string, winChance: number, updatedBy: number): Promise<GameSetting>;
  updateGamePayoutMultiplier(gameType: string, payoutMultiplier: number, updatedBy: number): Promise<GameSetting>;
  updateGameExtraSettings(gameType: string, extraSettings: string, updatedBy: number): Promise<GameSetting>;
  updateGameHouseEdge(gameType: string, data: { houseEdgePct?: number; highBetThreshold?: number; highBetWagerMultiplier?: number }, updatedBy: number): Promise<GameSetting>;
  recordHouseEdgeBet(gameType: string, amount: number): Promise<void>;
  recordHouseEdgePayout(gameType: string, amount: number): Promise<void>;
  resetGameHouseEdgeStats(gameType: string, updatedBy: number): Promise<GameSetting>;
  getUserTotalWagered(userId: number): Promise<number>;

  // Universal house edge (covers all games when enabled)
  getUniversalHouseEdge(): Promise<UniversalHouseEdge>;
  updateUniversalHouseEdge(data: UpdateUniversalHouseEdge, updatedBy: number): Promise<UniversalHouseEdge>;
  recordUniversalBet(amount: number): Promise<void>;
  recordUniversalPayout(amount: number): Promise<void>;
  resetUniversalHouseEdgeStats(updatedBy: number): Promise<UniversalHouseEdge>;
  // Zero out totalBet/totalPaid on every per-game settings row.
  resetAllGameStats(updatedBy: number): Promise<void>;
  // Sum of all house-side balances (admin + super_manager + manager).
  getHouseBankroll(): Promise<number>;

  // === MANAGER-OWNED CASINO POOL (decentralized bankroll) ===
  // Walks the createdBy chain to find the role='manager' ancestor of a player.
  getPlayerManagerId(userId: number): Promise<number | null>;
  // Returns the active casino bankroll for a manager: businessMoney if
  // useSeparateBusinessMoney=true, otherwise the manager's wallet balance.
  getManagerBankroll(managerId: number): Promise<number>;
  // Add to / subtract from the manager's casino pool (transparent on which
  // field per the manager's mode). Used by bet (credit) and win (debit).
  // All atomic via single SQL UPDATEs so concurrent bets cannot lose updates.
  creditManagerPool(managerId: number, amount: number): Promise<void>;
  debitManagerPool(managerId: number, amount: number): Promise<void>;
  // Atomic conditional debit: subtract `amount` only if the active pool can
  // cover it. Returns true on success, false if insufficient. Use this on
  // the win path so the affordability check and the deduction are one
  // operation (no time-of-check/time-of-use race).
  tryDebitManagerPool(managerId: number, amount: number): Promise<boolean>;
  // Super-manager actions on a single manager:
  setManagerBusinessMoneyMode(managerId: number, useSeparate: boolean): Promise<User>;
  adjustManagerBusinessMoney(managerId: number, delta: number): Promise<User>;
  setManagerReportSinceAt(managerId: number, ts: Date | null): Promise<User>;

  // === PER-MANAGER GAME OVERRIDES ===
  // Each row may set winChance and/or payoutMultiplier for one (manager,
  // gameType). Null cells inherit the global gameSettings value. Use
  // `getEffectiveGameSettings(userId, gameType)` from routes.ts to resolve.
  getManagerGameOverride(managerId: number, gameType: string): Promise<ManagerGameOverride | undefined>;
  getManagerGameOverridesByManager(managerId: number): Promise<ManagerGameOverride[]>;
  upsertManagerGameOverride(managerId: number, gameType: string, data: { winChance?: number | null; payoutMultiplier?: number | null }): Promise<ManagerGameOverride>;
  clearManagerGameOverride(managerId: number, gameType: string): Promise<void>;

  createWithdrawalRequest(req: { userId: number, amount: number, managerCode?: string, managerId?: number }): Promise<WithdrawalRequest>;
  getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined>;
  updateWithdrawalRequest(id: number, status: "approved" | "rejected", processedBy: number): Promise<WithdrawalRequest>;
  getPendingWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  getPendingWithdrawalRequestsByManagerId(managerId: number): Promise<WithdrawalRequest[]>;
  getUserWithdrawalRequests(userId: number): Promise<WithdrawalRequest[]>;
  getUserByWithdrawCode(code: string): Promise<User | undefined>;
  updateWithdrawCode(userId: number, code: string): Promise<User>;

  updateLastActive(userId: number): Promise<void>;
  updateProfitSharePercentage(userId: number, percentage: number): Promise<User>;

  createBroadcast(data: { senderId: number; senderRole: string; targetRole: string; message: string; fontFamily?: string; color?: string; scrollSpeed?: number; expiresAt?: Date | null }): Promise<Broadcast>;
  getBroadcastsForUser(userId: number, userRole: string, createdBy?: number | null): Promise<Broadcast[]>;
  dismissBroadcast(broadcastId: number, userId: number): Promise<void>;
  getDismissedBroadcastIds(userId: number): Promise<number[]>;
  getSentBroadcasts(senderId: number): Promise<Broadcast[]>;
  getPublicBroadcasts(): Promise<Broadcast[]>;

  createMessage(data: { senderId: number; receiverId: number; content: string }): Promise<Message>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  getUnreadCount(userId: number): Promise<number>;
  markMessagesAsRead(senderId: number, receiverId: number): Promise<void>;
  getChatContacts(userId: number): Promise<{ userId: number; lastMessage: string; lastMessageAt: Date | null; unreadCount: number }[]>;

  getPendingUsersByManager(managerId: number): Promise<User[]>;
  getVouchersByCreator(creatorId: number): Promise<Voucher[]>;

  getDisabledGamesForUser(userId: number): Promise<string[]>;
  getEffectiveDisabledGames(userId: number): Promise<string[]>;
  getBroadcastById(id: number): Promise<Broadcast | undefined>;
  deleteBroadcast(id: number): Promise<boolean>;
  expireBroadcast(id: number): Promise<Broadcast | undefined>;
  listGameSchedules(): Promise<GameSchedule[]>;
  createGameSchedule(data: InsertGameSchedule, createdBy: number): Promise<GameSchedule>;
  updateGameSchedule(id: number, data: Partial<InsertGameSchedule>): Promise<GameSchedule | undefined>;
  deleteGameSchedule(id: number): Promise<boolean>;
  setGameDisabled(userId: number, gameType: string, disabled: boolean): Promise<void>;

  getAudioTracks(): Promise<AudioTrack[]>;
  getAudioTrackByFilename(filename: string): Promise<AudioTrack | undefined>;
  createAudioTrack(data: InsertAudioTrack): Promise<AudioTrack>;
  backfillAudioTrackData(id: number, data: Buffer): Promise<void>;
  deleteAudioTrack(id: number): Promise<AudioTrack | undefined>;
  countAudioTracks(): Promise<number>;

  getSiteSettings(): Promise<SiteSettings>;
  updateSiteSettings(patch: Partial<SiteSettings>, updatedBy: number): Promise<SiteSettings>;
  getBackgroundImages(): Promise<BackgroundImage[]>;
  getBackgroundImageByFilename(filename: string): Promise<BackgroundImage | undefined>;
  createBackgroundImage(data: { filename: string; originalName: string; mimeType: string; size: number; data: Buffer; uploadedBy: number }): Promise<BackgroundImage>;
  deleteBackgroundImage(id: number): Promise<BackgroundImage | undefined>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: any): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserBalance(userId: number, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    const newBalance = user.balance + amount;
    const [updatedUser] = await db.update(users).set({ balance: newBalance }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async approveUser(userId: number): Promise<User> {
    const [updatedUser] = await db.update(users).set({ isApproved: true }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async updateUserPassword(userId: number, password: string): Promise<User> {
    const [updatedUser] = await db.update(users).set({ password }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async updateUserRole(userId: number, role: string): Promise<User> {
    const [updatedUser] = await db.update(users).set({ role: role as any }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async updateUsername(userId: number, username: string): Promise<User> {
    const [updatedUser] = await db.update(users).set({ username }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async suspendUser(userId: number): Promise<User> {
    const [updatedUser] = await db.update(users).set({ isSuspended: true }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async unsuspendUser(userId: number): Promise<User> {
    const [updatedUser] = await db.update(users).set({ isSuspended: false }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async getUsersByCreator(creatorId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.createdBy, creatorId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async setSecurityAnswers(userId: number, answers: { question: string; answer: string }[]): Promise<void> {
    await db.delete(adminSecurityAnswers).where(eq(adminSecurityAnswers.userId, userId));
    for (const ans of answers) {
      await db.insert(adminSecurityAnswers).values({ userId, question: ans.question, answer: ans.answer });
    }
  }

  async getSecurityAnswers(userId: number): Promise<AdminSecurityAnswer[]> {
    return await db.select().from(adminSecurityAnswers).where(eq(adminSecurityAnswers.userId, userId));
  }

  async createVoucher(voucher: InsertVoucher & { createdBy: number, code: string }): Promise<Voucher> {
    const [newVoucher] = await db.insert(vouchers).values(voucher).returning();
    return newVoucher;
  }

  async getVoucherByCode(code: string): Promise<Voucher | undefined> {
    const [voucher] = await db.select().from(vouchers).where(eq(vouchers.code, code));
    return voucher;
  }

  async redeemVoucher(voucherId: number, userId: number): Promise<Voucher> {
    const [updatedVoucher] = await db.update(vouchers).set({ isRedeemed: true, redeemedBy: userId }).where(eq(vouchers.id, voucherId)).returning();
    return updatedVoucher;
  }

  async getAllVouchers(): Promise<Voucher[]> {
    return await db.select().from(vouchers).orderBy(desc(vouchers.createdAt));
  }

  async createTransaction(transaction: { userId: number, amount: number, type: string, description?: string }): Promise<Transaction> {
    // @ts-ignore
    const [tx] = await db.insert(transactions).values(transaction).returning();
    return tx;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByUserIds(userIds: number[]): Promise<Transaction[]> {
    if (userIds.length === 0) return [];
    return await db.select().from(transactions).where(inArray(transactions.userId, userIds)).orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByUserIdsAndDateRange(userIds: number[], from?: Date, to?: Date): Promise<Transaction[]> {
    if (userIds.length === 0) return [];
    const conditions = [inArray(transactions.userId, userIds)];
    if (from) conditions.push(gte(transactions.createdAt, from));
    if (to) conditions.push(lte(transactions.createdAt, to));
    return await db.select().from(transactions).where(and(...conditions)).orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByDateRange(from?: Date, to?: Date): Promise<Transaction[]> {
    const conditions = [];
    if (from) conditions.push(gte(transactions.createdAt, from));
    if (to) conditions.push(lte(transactions.createdAt, to));
    if (conditions.length === 0) return await this.getAllTransactions();
    return await db.select().from(transactions).where(and(...conditions)).orderBy(desc(transactions.createdAt));
  }

  async getWithdrawalsByUserIds(userIds: number[]): Promise<WithdrawalRequest[]> {
    if (userIds.length === 0) return [];
    return await db.select().from(withdrawalRequests).where(inArray(withdrawalRequests.userId, userIds)).orderBy(desc(withdrawalRequests.createdAt));
  }

  async getWithdrawalsByUserIdsAndDateRange(userIds: number[], from?: Date, to?: Date): Promise<WithdrawalRequest[]> {
    if (userIds.length === 0) return [];
    const conditions = [inArray(withdrawalRequests.userId, userIds)];
    if (from) conditions.push(gte(withdrawalRequests.createdAt, from));
    if (to) conditions.push(lte(withdrawalRequests.createdAt, to));
    return await db.select().from(withdrawalRequests).where(and(...conditions)).orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawalsByDateRange(from?: Date, to?: Date): Promise<WithdrawalRequest[]> {
    const conditions = [];
    if (from) conditions.push(gte(withdrawalRequests.createdAt, from));
    if (to) conditions.push(lte(withdrawalRequests.createdAt, to));
    if (conditions.length === 0) return await db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.createdAt));
    return await db.select().from(withdrawalRequests).where(and(...conditions)).orderBy(desc(withdrawalRequests.createdAt));
  }

  async getGameSettings(gameType: string): Promise<GameSetting | undefined> {
    const [settings] = await db.select().from(gameSettings).where(eq(gameSettings.gameType, gameType as any));
    return settings;
  }

  async getAllGameSettings(): Promise<GameSetting[]> {
    return await db.select().from(gameSettings);
  }

  async updateGameSettings(gameType: string, winChance: number, updatedBy: number): Promise<GameSetting> {
    const [updated] = await db.insert(gameSettings)
      .values({ gameType: gameType as any, winChance, updatedBy })
      .onConflictDoUpdate({
        target: gameSettings.gameType,
        set: { winChance, updatedBy, updatedAt: new Date() }
      })
      .returning();
    return updated;
  }

  async updateGamePayoutMultiplier(gameType: string, payoutMultiplier: number, updatedBy: number): Promise<GameSetting> {
    const [updated] = await db.insert(gameSettings)
      .values({ gameType: gameType as any, winChance: 0.3, payoutMultiplier, updatedBy })
      .onConflictDoUpdate({
        target: gameSettings.gameType,
        set: { payoutMultiplier, updatedBy, updatedAt: new Date() }
      })
      .returning();
    return updated;
  }

  async updateGameExtraSettings(gameType: string, extraSettings: string, updatedBy: number): Promise<GameSetting> {
    const [updated] = await db.insert(gameSettings)
      .values({ gameType: gameType as any, winChance: 0.3, payoutMultiplier: 2.0, extraSettings, updatedBy })
      .onConflictDoUpdate({
        target: gameSettings.gameType,
        set: { extraSettings, updatedBy, updatedAt: new Date() }
      })
      .returning();
    return updated;
  }

  async updateGameHouseEdge(gameType: string, data: { houseEdgePct?: number; highBetThreshold?: number; highBetWagerMultiplier?: number }, updatedBy: number): Promise<GameSetting> {
    const setObj: any = { updatedBy, updatedAt: new Date() };
    if (data.houseEdgePct !== undefined) setObj.houseEdgePct = data.houseEdgePct;
    if (data.highBetThreshold !== undefined) setObj.highBetThreshold = data.highBetThreshold;
    if (data.highBetWagerMultiplier !== undefined) setObj.highBetWagerMultiplier = data.highBetWagerMultiplier;
    const insertVals: any = { gameType: gameType as any, winChance: 0.3, payoutMultiplier: 2.0, updatedBy };
    if (data.houseEdgePct !== undefined) insertVals.houseEdgePct = data.houseEdgePct;
    if (data.highBetThreshold !== undefined) insertVals.highBetThreshold = data.highBetThreshold;
    if (data.highBetWagerMultiplier !== undefined) insertVals.highBetWagerMultiplier = data.highBetWagerMultiplier;
    const [updated] = await db.insert(gameSettings)
      .values(insertVals)
      .onConflictDoUpdate({ target: gameSettings.gameType, set: setObj })
      .returning();
    return updated;
  }

  async recordHouseEdgeBet(gameType: string, amount: number): Promise<void> {
    await db.execute(sql`
      INSERT INTO game_settings (game_type, win_chance, payout_multiplier, total_bet, updated_by)
      VALUES (${gameType}, 0.3, 2.0, ${amount}, 1)
      ON CONFLICT (game_type) DO UPDATE SET total_bet = game_settings.total_bet + ${amount}, updated_at = NOW()
    `);
  }

  async recordHouseEdgePayout(gameType: string, amount: number): Promise<void> {
    await db.execute(sql`
      INSERT INTO game_settings (game_type, win_chance, payout_multiplier, total_paid, updated_by)
      VALUES (${gameType}, 0.3, 2.0, ${amount}, 1)
      ON CONFLICT (game_type) DO UPDATE SET total_paid = game_settings.total_paid + ${amount}, updated_at = NOW()
    `);
  }

  async resetGameHouseEdgeStats(gameType: string, updatedBy: number): Promise<GameSetting> {
    const [updated] = await db.insert(gameSettings)
      .values({ gameType: gameType as any, winChance: 0.3, payoutMultiplier: 2.0, totalBet: 0, totalPaid: 0, updatedBy })
      .onConflictDoUpdate({
        target: gameSettings.gameType,
        set: { totalBet: 0, totalPaid: 0, updatedBy, updatedAt: new Date() }
      })
      .returning();
    return updated;
  }

  async getUniversalHouseEdge(): Promise<UniversalHouseEdge> {
    // Idempotent singleton init: upsert id=1 with no-op ON CONFLICT so two
    // concurrent first-time callers can't collide on the primary key.
    await db.insert(universalHouseEdge)
      .values({ id: 1 })
      .onConflictDoNothing({ target: universalHouseEdge.id });
    const [row] = await db.select().from(universalHouseEdge).where(eq(universalHouseEdge.id, 1));
    return row;
  }

  async updateUniversalHouseEdge(data: UpdateUniversalHouseEdge, updatedBy: number): Promise<UniversalHouseEdge> {
    await this.getUniversalHouseEdge(); // ensure row exists
    const setObj: any = { updatedBy, updatedAt: new Date() };
    if (data.enabled !== undefined) setObj.enabled = data.enabled;
    if (data.houseEdgePct !== undefined) setObj.houseEdgePct = data.houseEdgePct;
    if (data.minHouseBalance !== undefined) setObj.minHouseBalance = data.minHouseBalance;
    if (data.bypassClassicSlotsBankroll !== undefined) setObj.bypassClassicSlotsBankroll = data.bypassClassicSlotsBankroll;
    if (data.bypassHorse4Bankroll !== undefined) setObj.bypassHorse4Bankroll = data.bypassHorse4Bankroll;
    if (data.bypassDogRacingBankroll !== undefined) setObj.bypassDogRacingBankroll = data.bypassDogRacingBankroll;
    const [row] = await db.update(universalHouseEdge).set(setObj).where(eq(universalHouseEdge.id, 1)).returning();
    return row;
  }

  async recordUniversalBet(amount: number): Promise<void> {
    if (amount <= 0) return;
    await this.getUniversalHouseEdge();
    await db.execute(sql`UPDATE universal_house_edge SET total_bet = total_bet + ${amount}, updated_at = NOW() WHERE id = 1`);
  }

  async recordUniversalPayout(amount: number): Promise<void> {
    if (amount <= 0) return;
    await this.getUniversalHouseEdge();
    await db.execute(sql`UPDATE universal_house_edge SET total_paid = total_paid + ${amount}, updated_at = NOW() WHERE id = 1`);
  }

  async resetUniversalHouseEdgeStats(updatedBy: number): Promise<UniversalHouseEdge> {
    await this.getUniversalHouseEdge();
    const [row] = await db.update(universalHouseEdge)
      .set({ totalBet: 0, totalPaid: 0, updatedBy, updatedAt: new Date() })
      .where(eq(universalHouseEdge.id, 1))
      .returning();
    return row;
  }

  async resetAllGameStats(updatedBy: number): Promise<void> {
    await db.update(gameSettings).set({ totalBet: 0, totalPaid: 0, updatedBy, updatedAt: new Date() });
  }

  // === MANAGER-OWNED CASINO POOL ===
  async getPlayerManagerId(userId: number): Promise<number | null> {
    let current = await this.getUser(userId);
    let hops = 0;
    while (current && hops < 6) {
      if (current.role === 'manager') return current.id;
      if (current.createdBy == null) return null;
      current = await this.getUser(current.createdBy);
      hops++;
    }
    return null;
  }

  async getManagerBankroll(managerId: number): Promise<number> {
    const m = await this.getUser(managerId);
    if (!m) return 0;
    return m.useSeparateBusinessMoney ? m.businessMoney : m.balance;
  }

  // Atomic credit: single UPDATE picks the active pool column via CASE on
  // use_separate_business_money so concurrent bets cannot lose updates.
  async creditManagerPool(managerId: number, amount: number): Promise<void> {
    if (amount <= 0) return;
    await db.execute(sql`
      UPDATE users
      SET business_money = business_money + (CASE WHEN use_separate_business_money THEN ${amount} ELSE 0 END),
          balance        = balance        + (CASE WHEN use_separate_business_money THEN 0 ELSE ${amount} END)
      WHERE id = ${managerId}
    `);
  }

  // Atomic unconditional debit (used by super-manager withdraw-profits where
  // the route already verified sufficiency).
  async debitManagerPool(managerId: number, amount: number): Promise<void> {
    if (amount <= 0) return;
    await db.execute(sql`
      UPDATE users
      SET business_money = business_money - (CASE WHEN use_separate_business_money THEN ${amount} ELSE 0 END),
          balance        = balance        - (CASE WHEN use_separate_business_money THEN 0 ELSE ${amount} END)
      WHERE id = ${managerId}
    `);
  }

  // Atomic conditional debit: subtract only if the active pool can cover.
  async tryDebitManagerPool(managerId: number, amount: number): Promise<boolean> {
    if (amount <= 0) return true;
    const result: any = await db.execute(sql`
      UPDATE users
      SET business_money = business_money - (CASE WHEN use_separate_business_money THEN ${amount} ELSE 0 END),
          balance        = balance        - (CASE WHEN use_separate_business_money THEN 0 ELSE ${amount} END)
      WHERE id = ${managerId}
        AND (CASE WHEN use_separate_business_money THEN business_money ELSE balance END) >= ${amount}
    `);
    // node-postgres returns rowCount on the result
    return (result?.rowCount ?? result?.count ?? 0) > 0;
  }

  async setManagerBusinessMoneyMode(managerId: number, useSeparate: boolean): Promise<User> {
    const [row] = await db.update(users).set({ useSeparateBusinessMoney: useSeparate }).where(eq(users.id, managerId)).returning();
    return row;
  }

  async adjustManagerBusinessMoney(managerId: number, delta: number): Promise<User> {
    const m = await this.getUser(managerId);
    if (!m) throw new Error("Manager not found");
    const newVal = Math.max(0, m.businessMoney + delta);
    const [row] = await db.update(users).set({ businessMoney: newVal }).where(eq(users.id, managerId)).returning();
    return row;
  }

  async getManagerGameOverride(managerId: number, gameType: string): Promise<ManagerGameOverride | undefined> {
    const [row] = await db.select().from(managerGameOverrides)
      .where(and(eq(managerGameOverrides.managerId, managerId), eq(managerGameOverrides.gameType, gameType)));
    return row;
  }
  async getManagerGameOverridesByManager(managerId: number): Promise<ManagerGameOverride[]> {
    return await db.select().from(managerGameOverrides).where(eq(managerGameOverrides.managerId, managerId));
  }
  async upsertManagerGameOverride(
    managerId: number, gameType: string,
    data: { winChance?: number | null; payoutMultiplier?: number | null }
  ): Promise<ManagerGameOverride> {
    // Atomic upsert via the unique (manager_id, game_type) constraint.
    // Omitted fields preserve the existing value via a self-reference in SET.
    const setClause: Record<string, any> = { updatedAt: new Date() };
    setClause.winChance = data.winChance === undefined
      ? sql`${managerGameOverrides.winChance}`
      : data.winChance;
    setClause.payoutMultiplier = data.payoutMultiplier === undefined
      ? sql`${managerGameOverrides.payoutMultiplier}`
      : data.payoutMultiplier;
    const [row] = await db.insert(managerGameOverrides).values({
      managerId, gameType,
      winChance: data.winChance ?? null,
      payoutMultiplier: data.payoutMultiplier ?? null,
    }).onConflictDoUpdate({
      target: [managerGameOverrides.managerId, managerGameOverrides.gameType],
      set: setClause,
    }).returning();
    return row;
  }
  async clearManagerGameOverride(managerId: number, gameType: string): Promise<void> {
    await db.delete(managerGameOverrides)
      .where(and(eq(managerGameOverrides.managerId, managerId), eq(managerGameOverrides.gameType, gameType)));
  }

  async setManagerReportSinceAt(managerId: number, ts: Date | null): Promise<User> {
    const [row] = await db.update(users).set({ reportSinceAt: ts }).where(eq(users.id, managerId)).returning();
    return row;
  }

  async getHouseBankroll(): Promise<number> {
    const [{ total }] = await db.select({
      total: sql<number>`COALESCE(SUM(${users.balance}), 0)`,
    }).from(users).where(inArray(users.role, ['admin', 'super_manager', 'manager']));
    return Number(total);
  }

  async getUserTotalWagered(userId: number): Promise<number> {
    const [{ total }] = await db.select({
      total: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`
    }).from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.type, "bet")));
    return Number(total);
  }

  async createWithdrawalRequest(req: { userId: number, amount: number, managerCode?: string, managerId?: number }): Promise<WithdrawalRequest> {
    const [newReq] = await db.insert(withdrawalRequests).values({ ...req, status: "pending" }).returning();
    return newReq;
  }

  async getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined> {
    const [req] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id));
    return req;
  }

  async updateWithdrawalRequest(id: number, status: "approved" | "rejected", processedBy: number): Promise<WithdrawalRequest> {
    const [updated] = await db.update(withdrawalRequests)
      .set({ status, processedBy, processedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return updated;
  }

  async getPendingWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.status, "pending")).orderBy(desc(withdrawalRequests.createdAt));
  }

  async getUserWithdrawalRequests(userId: number): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, userId)).orderBy(desc(withdrawalRequests.createdAt));
  }

  async getPendingWithdrawalRequestsByManagerId(managerId: number): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests)
      .where(and(eq(withdrawalRequests.managerId, managerId), eq(withdrawalRequests.status, "pending")))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getUserByWithdrawCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.withdrawCode, code));
    return user;
  }

  async updateWithdrawCode(userId: number, code: string): Promise<User> {
    const [updated] = await db.update(users).set({ withdrawCode: code }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateLastActive(userId: number): Promise<void> {
    await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, userId));
  }

  async updateProfitSharePercentage(userId: number, percentage: number): Promise<User> {
    const [updated] = await db.update(users).set({ profitSharePercentage: percentage }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async createBroadcast(data: { senderId: number; senderRole: string; targetRole: string; message: string; fontFamily?: string; color?: string; scrollSpeed?: number; expiresAt?: Date | null }): Promise<Broadcast> {
    const [broadcast] = await db.insert(broadcasts).values({
      senderId: data.senderId,
      senderRole: data.senderRole as "admin" | "super_manager" | "manager",
      targetRole: data.targetRole as "super_manager" | "manager" | "user" | "all" | "public",
      message: data.message,
      fontFamily: data.fontFamily || "sans-serif",
      color: data.color || "#FFD700",
      scrollSpeed: data.scrollSpeed || 15,
      expiresAt: data.expiresAt || null,
    }).returning();
    return broadcast;
  }

  async getBroadcastsForUser(userId: number, userRole: string, createdBy?: number | null): Promise<Broadcast[]> {
    const allBroadcasts = await db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt));
    const dismissedIds = await this.getDismissedBroadcastIds(userId);

    const now = new Date();
    return allBroadcasts.filter(b => {
      if (dismissedIds.includes(b.id)) return false;
      if (b.expiresAt && new Date(b.expiresAt) < now) return false;
      if (b.targetRole === 'public') return true;
      if (b.targetRole === 'all') return true;
      if (b.targetRole === userRole) {
        if (userRole === 'super_manager') return b.senderRole === 'admin';
        if (userRole === 'manager') {
          return b.senderRole === 'admin' || (b.senderRole === 'super_manager' && createdBy === b.senderId);
        }
        if (userRole === 'user') {
          return b.senderRole === 'admin' || (b.senderRole === 'manager' && createdBy === b.senderId);
        }
      }
      return false;
    });
  }

  async dismissBroadcast(broadcastId: number, userId: number): Promise<void> {
    const existing = await db.select().from(broadcastDismissals)
      .where(and(eq(broadcastDismissals.broadcastId, broadcastId), eq(broadcastDismissals.userId, userId)));
    if (existing.length === 0) {
      await db.insert(broadcastDismissals).values({ broadcastId, userId });
    }
  }

  async getDismissedBroadcastIds(userId: number): Promise<number[]> {
    const dismissed = await db.select().from(broadcastDismissals).where(eq(broadcastDismissals.userId, userId));
    return dismissed.map(d => d.broadcastId);
  }

  async getSentBroadcasts(senderId: number): Promise<Broadcast[]> {
    return await db.select().from(broadcasts).where(eq(broadcasts.senderId, senderId)).orderBy(desc(broadcasts.createdAt));
  }

  async getBroadcastById(id: number): Promise<Broadcast | undefined> {
    const [b] = await db.select().from(broadcasts).where(eq(broadcasts.id, id));
    return b;
  }

  async deleteBroadcast(id: number): Promise<boolean> {
    await db.delete(broadcastDismissals).where(eq(broadcastDismissals.broadcastId, id));
    const result = await db.delete(broadcasts).where(eq(broadcasts.id, id)).returning();
    return result.length > 0;
  }

  async expireBroadcast(id: number): Promise<Broadcast | undefined> {
    // Mark as already-expired so the marquee stops showing it but the row stays for history.
    const [updated] = await db.update(broadcasts).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(broadcasts.id, id)).returning();
    return updated;
  }

  async listGameSchedules(): Promise<GameSchedule[]> {
    return await db.select().from(gameSchedules).orderBy(gameSchedules.gameType, gameSchedules.startTime);
  }

  async createGameSchedule(data: InsertGameSchedule, createdBy: number): Promise<GameSchedule> {
    const [row] = await db.insert(gameSchedules).values({ ...data, createdBy } as any).returning();
    return row;
  }

  async updateGameSchedule(id: number, data: Partial<InsertGameSchedule>): Promise<GameSchedule | undefined> {
    const [row] = await db.update(gameSchedules).set(data as any).where(eq(gameSchedules.id, id)).returning();
    return row;
  }

  async deleteGameSchedule(id: number): Promise<boolean> {
    const r = await db.delete(gameSchedules).where(eq(gameSchedules.id, id)).returning();
    return r.length > 0;
  }

  async getPublicBroadcasts(): Promise<Broadcast[]> {
    const all = await db.select().from(broadcasts)
      .where(eq(broadcasts.targetRole, "public"))
      .orderBy(desc(broadcasts.createdAt))
      .limit(10);
    const now = new Date();
    return all.filter(b => !b.expiresAt || new Date(b.expiresAt) >= now);
  }

  async createMessage(data: { senderId: number; receiverId: number; content: string }): Promise<Message> {
    const [message] = await db.insert(messages).values({
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content,
    }).returning();
    return message;
  }

  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    const result = await db.select().from(messages).where(
      sql`(${messages.senderId} = ${userId1} AND ${messages.receiverId} = ${userId2}) OR (${messages.senderId} = ${userId2} AND ${messages.receiverId} = ${userId1})`
    ).orderBy(messages.createdAt);
    return result;
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<void> {
    await db.update(messages).set({ isRead: true })
      .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId), eq(messages.isRead, false)));
  }

  async getChatContacts(userId: number): Promise<{ userId: number; lastMessage: string; lastMessageAt: Date | null; unreadCount: number }[]> {
    const allMessages = await db.select().from(messages).where(
      sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`
    ).orderBy(desc(messages.createdAt));

    const contactMap = new Map<number, { lastMessage: string; lastMessageAt: Date | null; unreadCount: number }>();
    for (const msg of allMessages) {
      const contactId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!contactMap.has(contactId)) {
        contactMap.set(contactId, { lastMessage: msg.content, lastMessageAt: msg.createdAt, unreadCount: 0 });
      }
      if (msg.receiverId === userId && !msg.isRead) {
        const entry = contactMap.get(contactId)!;
        entry.unreadCount++;
      }
    }
    return Array.from(contactMap.entries()).map(([uid, data]) => ({ userId: uid, ...data }));
  }

  async getPendingUsersByManager(managerId: number): Promise<User[]> {
    return await db.select().from(users)
      .where(and(eq(users.createdBy, managerId), eq(users.isApproved, false)))
      .orderBy(desc(users.createdAt));
  }

  async getVouchersByCreator(creatorId: number): Promise<Voucher[]> {
    return await db.select().from(vouchers)
      .where(eq(vouchers.createdBy, creatorId))
      .orderBy(desc(vouchers.createdAt));
  }

  async getDisabledGamesForUser(userId: number): Promise<string[]> {
    const rows = await db.select({ gameType: userGameDisables.gameType })
      .from(userGameDisables)
      .where(eq(userGameDisables.userId, userId));
    return rows.map(r => r.gameType);
  }

  // Walks up the createdBy chain. A game is "effectively disabled" for a user
  // if it is disabled for them OR any ancestor (the manager / super_manager /
  // admin who sits above them). This implements the cascading shut-off rule.
  async getEffectiveDisabledGames(userId: number): Promise<string[]> {
    const ids: number[] = [];
    let current: number | null = userId;
    const seen = new Set<number>();
    while (current && !seen.has(current)) {
      seen.add(current);
      ids.push(current);
      const [u] = await db.select({ createdBy: users.createdBy })
        .from(users)
        .where(eq(users.id, current));
      current = u?.createdBy ?? null;
      if (ids.length > 8) break; // safety
    }
    if (ids.length === 0) return [];
    const rows = await db.select({ gameType: userGameDisables.gameType })
      .from(userGameDisables)
      .where(inArray(userGameDisables.userId, ids));
    return Array.from(new Set(rows.map(r => r.gameType)));
  }

  async setGameDisabled(userId: number, gameType: string, disabled: boolean): Promise<void> {
    if (disabled) {
      await db.execute(sql`
        INSERT INTO user_game_disables (user_id, game_type)
        VALUES (${userId}, ${gameType})
        ON CONFLICT (user_id, game_type) DO NOTHING
      `);
    } else {
      await db.delete(userGameDisables)
        .where(and(eq(userGameDisables.userId, userId), eq(userGameDisables.gameType, gameType)));
    }
  }

  async getAudioTracks(): Promise<AudioTrack[]> {
    // Exclude binary `data` from list responses to keep payload small.
    return await db.select({
      id: audioTracks.id,
      filename: audioTracks.filename,
      originalName: audioTracks.originalName,
      mimeType: audioTracks.mimeType,
      size: audioTracks.size,
      uploadedBy: audioTracks.uploadedBy,
      data: sql<Buffer>`NULL`.as("data"),
      createdAt: audioTracks.createdAt,
    }).from(audioTracks).orderBy(desc(audioTracks.createdAt));
  }

  async getAudioTrackByFilename(filename: string): Promise<AudioTrack | undefined> {
    const [track] = await db.select().from(audioTracks).where(eq(audioTracks.filename, filename));
    return track;
  }

  async createAudioTrack(data: InsertAudioTrack): Promise<AudioTrack> {
    const [track] = await db.insert(audioTracks).values(data).returning();
    return track;
  }

  async backfillAudioTrackData(id: number, data: Buffer): Promise<void> {
    await db.update(audioTracks).set({ data }).where(eq(audioTracks.id, id));
  }

  async deleteAudioTrack(id: number): Promise<AudioTrack | undefined> {
    const [track] = await db.delete(audioTracks).where(eq(audioTracks.id, id)).returning();
    return track;
  }

  async countAudioTracks(): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(audioTracks);
    return Number(count);
  }

  async getSiteSettings(): Promise<SiteSettings> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
    if (row) return row;
    const [created] = await db.insert(siteSettings).values({ id: 1, bgType: "default" }).returning();
    return created;
  }

  async updateSiteSettings(patch: Partial<SiteSettings>, updatedBy: number): Promise<SiteSettings> {
    await this.getSiteSettings(); // ensure row exists
    const { id: _omit, ...rest } = patch as any;
    const [row] = await db.update(siteSettings)
      .set({ ...rest, updatedBy, updatedAt: new Date() })
      .where(eq(siteSettings.id, 1))
      .returning();
    return row;
  }

  async getBackgroundImages(): Promise<BackgroundImage[]> {
    return await db.select({
      id: backgroundImages.id,
      filename: backgroundImages.filename,
      originalName: backgroundImages.originalName,
      mimeType: backgroundImages.mimeType,
      size: backgroundImages.size,
      data: sql<Buffer>`NULL`.as("data"),
      uploadedBy: backgroundImages.uploadedBy,
      createdAt: backgroundImages.createdAt,
    }).from(backgroundImages).orderBy(desc(backgroundImages.createdAt));
  }

  async getBackgroundImageByFilename(filename: string): Promise<BackgroundImage | undefined> {
    const [img] = await db.select().from(backgroundImages).where(eq(backgroundImages.filename, filename));
    return img;
  }

  async createBackgroundImage(data: { filename: string; originalName: string; mimeType: string; size: number; data: Buffer; uploadedBy: number }): Promise<BackgroundImage> {
    const [img] = await db.insert(backgroundImages).values(data).returning();
    return img;
  }

  async deleteBackgroundImage(id: number): Promise<BackgroundImage | undefined> {
    const [img] = await db.delete(backgroundImages).where(eq(backgroundImages.id, id)).returning();
    return img;
  }
}

export const storage = new DatabaseStorage();
