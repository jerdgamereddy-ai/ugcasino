import { users, vouchers, transactions, type User, type InsertUser, type Voucher, type InsertVoucher, type Transaction } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>; // amount can be negative
  getAllUsers(): Promise<User[]>;

  // Vouchers
  createVoucher(voucher: InsertVoucher & { createdBy: number, code: string }): Promise<Voucher>;
  getVoucherByCode(code: string): Promise<Voucher | undefined>;
  redeemVoucher(voucherId: number, userId: number): Promise<Voucher>;
  getAllVouchers(): Promise<Voucher[]>;

  // Transactions
  createTransaction(transaction: { userId: number, amount: number, type: string, description?: string }): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
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
    // Ideally use a transaction here for atomic updates, but for this demo:
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const newBalance = user.balance + amount;
    const [updatedUser] = await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
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
    const [updatedVoucher] = await db
      .update(vouchers)
      .set({ isRedeemed: true, redeemedBy: userId })
      .where(eq(vouchers.id, voucherId))
      .returning();
    return updatedVoucher;
  }

  async getAllVouchers(): Promise<Voucher[]> {
    return await db.select().from(vouchers).orderBy(desc(vouchers.createdAt));
  }

  async createTransaction(transaction: { userId: number, amount: number, type: string, description?: string }): Promise<Transaction> {
    // @ts-ignore - type mismatch for enum but it's fine for now as we validate upstream
    const [tx] = await db.insert(transactions).values(transaction).returning();
    return tx;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }
}

export const storage = new DatabaseStorage();
