import { users, vouchers, transactions, gameSettings, withdrawalRequests, type User, type InsertUser, type Voucher, type InsertVoucher, type Transaction, type GameSetting, type WithdrawalRequest, type InsertWithdrawalRequest } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session Store
  sessionStore: session.Store;
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;
  approveUser(userId: number): Promise<User>;
  updateUserPassword(userId: number, password: string): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Vouchers
  createVoucher(voucher: InsertVoucher & { createdBy: number, code: string }): Promise<Voucher>;
  getVoucherByCode(code: string): Promise<Voucher | undefined>;
  redeemVoucher(voucherId: number, userId: number): Promise<Voucher>;
  getAllVouchers(): Promise<Voucher[]>;

  // Transactions
  createTransaction(transaction: { userId: number, amount: number, type: string, description?: string }): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;

  // Game Settings
  getGameSettings(gameType: string): Promise<GameSetting | undefined>;
  getAllGameSettings(): Promise<GameSetting[]>;
  updateGameSettings(gameType: string, winChance: number, updatedBy: number): Promise<GameSetting>;

  // Withdrawal Requests
  createWithdrawalRequest(req: { userId: number, amount: number }): Promise<WithdrawalRequest>;
  getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined>;
  updateWithdrawalRequest(id: number, status: "approved" | "rejected", processedBy: number): Promise<WithdrawalRequest>;
  getPendingWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  getUserWithdrawalRequests(userId: number): Promise<WithdrawalRequest[]>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
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

  // Game Settings
  async getGameSettings(gameType: "slots" | "roulette" | "dice" | "hilo" | "coinflip" | "plinko" | "mines"): Promise<GameSetting | undefined> {
    const [settings] = await db.select().from(gameSettings).where(eq(gameSettings.gameType, gameType));
    return settings;
  }

  async getAllGameSettings(): Promise<GameSetting[]> {
    return await db.select().from(gameSettings);
  }

  async updateGameSettings(gameType: "slots" | "roulette" | "dice" | "hilo" | "coinflip" | "plinko" | "mines", winChance: number, updatedBy: number): Promise<GameSetting> {
    const [updated] = await db.insert(gameSettings)
      .values({ gameType, winChance, updatedBy })
      .onConflictDoUpdate({
        target: gameSettings.gameType,
        set: { winChance, updatedBy, updatedAt: new Date() }
      })
      .returning();
    return updated;
  }

  // Withdrawal Requests
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
}

export const storage = new DatabaseStorage();
