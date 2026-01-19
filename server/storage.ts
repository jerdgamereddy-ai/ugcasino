import { users, vouchers, transactions, gameSettings, type User, type InsertUser, type Voucher, type InsertVoucher, type Transaction, type GameSetting } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;
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
}

export class DatabaseStorage implements IStorage {
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
  async getGameSettings(gameType: "slots" | "roulette" | "dice" | "hilo"): Promise<GameSetting | undefined> {
    const [settings] = await db.select().from(gameSettings).where(eq(gameSettings.gameType, gameType));
    return settings;
  }

  async getAllGameSettings(): Promise<GameSetting[]> {
    return await db.select().from(gameSettings);
  }

  async updateGameSettings(gameType: "slots" | "roulette" | "dice" | "hilo", winChance: number, updatedBy: number): Promise<GameSetting> {
    const [updated] = await db.insert(gameSettings)
      .values({ gameType, winChance, updatedBy })
      .onConflictDoUpdate({
        target: gameSettings.gameType,
        set: { winChance, updatedBy, updatedAt: new Date() }
      })
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
