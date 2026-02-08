import { users, vouchers, transactions, gameSettings, withdrawalRequests, adminSecurityAnswers, broadcasts, broadcastDismissals, type User, type InsertUser, type Voucher, type InsertVoucher, type Transaction, type GameSetting, type WithdrawalRequest, type InsertWithdrawalRequest, type AdminSecurityAnswer, type Broadcast, type BroadcastDismissal } from "@shared/schema";
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

  createWithdrawalRequest(req: { userId: number, amount: number }): Promise<WithdrawalRequest>;
  getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined>;
  updateWithdrawalRequest(id: number, status: "approved" | "rejected", processedBy: number): Promise<WithdrawalRequest>;
  getPendingWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  getUserWithdrawalRequests(userId: number): Promise<WithdrawalRequest[]>;

  createBroadcast(data: { senderId: number; senderRole: string; targetRole: string; message: string }): Promise<Broadcast>;
  getBroadcastsForUser(userId: number, userRole: string, createdBy?: number | null): Promise<Broadcast[]>;
  dismissBroadcast(broadcastId: number, userId: number): Promise<void>;
  getDismissedBroadcastIds(userId: number): Promise<number[]>;
  getSentBroadcasts(senderId: number): Promise<Broadcast[]>;
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

  async createWithdrawalRequest(req: { userId: number, amount: number }): Promise<WithdrawalRequest> {
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

  async createBroadcast(data: { senderId: number; senderRole: string; targetRole: string; message: string }): Promise<Broadcast> {
    const [broadcast] = await db.insert(broadcasts).values({
      senderId: data.senderId,
      senderRole: data.senderRole as "admin" | "super_manager" | "manager",
      targetRole: data.targetRole as "super_manager" | "manager" | "user" | "all",
      message: data.message,
    }).returning();
    return broadcast;
  }

  async getBroadcastsForUser(userId: number, userRole: string, createdBy?: number | null): Promise<Broadcast[]> {
    const allBroadcasts = await db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt));
    const dismissedIds = await this.getDismissedBroadcastIds(userId);

    return allBroadcasts.filter(b => {
      if (dismissedIds.includes(b.id)) return false;
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
}

export const storage = new DatabaseStorage();
