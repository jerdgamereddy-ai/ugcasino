import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { randomBytes } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // === ADMIN REPORTS ===
  app.get(api.admin.reports.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === 'user') return res.status(403).send("Forbidden");
    
    const transactions = await storage.getAllTransactions();
    
    const report = transactions.reduce((acc, tx) => {
      const date = tx.createdAt ? new Date(tx.createdAt).toISOString().split('T')[0] : 'unknown';
      if (!acc.dailyStats[date]) {
        acc.dailyStats[date] = { date, bets: 0, wins: 0, deposits: 0 };
      }

      if (tx.type === 'deposit' || tx.type === 'voucher_redemption') {
        acc.totalDeposits += tx.amount;
        acc.dailyStats[date].deposits += tx.amount;
      }
      if (tx.type === 'withdrawal') acc.totalWithdrawals += Math.abs(tx.amount);
      if (tx.type === 'bet') {
        acc.totalBets += Math.abs(tx.amount);
        acc.dailyStats[date].bets += Math.abs(tx.amount);
      }
      if (tx.type === 'win') {
        acc.totalWins += tx.amount;
        acc.dailyStats[date].wins += tx.amount;
      }
      return acc;
    }, {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalBets: 0,
      totalWins: 0,
      dailyStats: {} as Record<string, { date: string; bets: number; wins: number; deposits: number }>,
    });

    const users = await storage.getAllUsers();
    const totalPendingBalance = users.reduce((sum, u) => sum + u.balance, 0);

    res.json({
      ...report,
      totalPendingBalance,
      netRevenue: report.totalBets - report.totalWins,
      transactions: transactions.slice(0, 100),
      dailyStats: Object.values(report.dailyStats).sort((a, b) => b.date.localeCompare(a.date)),
    });
  });

  // === GAME SETTINGS ===
  app.get(api.games.settings.get.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === 'user') return res.status(403).send("Forbidden");
    
    let settings = await storage.getAllGameSettings();
    const gameTypes = ["slots", "roulette", "dice", "hilo"] as const;
    const existingTypes = settings.map(s => s.gameType);
    
    // Seed missing settings on the fly
    for (const type of gameTypes) {
      if (!existingTypes.includes(type)) {
        const newSetting = await storage.updateGameSettings(type as any, type === "dice" || type === "hilo" ? 0.48 : 0.3, req.user.id);
        settings.push(newSetting);
      }
    }
    
    res.json(settings);
  });

  // ... rest of game settings ...

  // === HILO GAME ===
  app.post("/api/games/hilo/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const { bet, prediction, lastCard } = z.object({ 
        bet: z.number().min(100),
        prediction: z.enum(["higher", "lower"]),
        lastCard: z.number().nullable()
      }).parse(req.body);

      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("hilo");
      const winChance = settings?.winChance ?? 0.48;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "HiLo play" });

      const won = Math.random() < winChance;
      const nextCard = won 
        ? (prediction === "higher" 
            ? Math.floor(Math.random() * (13 - (lastCard || 7))) + (lastCard || 7) + 1
            : Math.floor(Math.random() * ((lastCard || 7) - 1)) + 1)
        : (prediction === "higher"
            ? Math.floor(Math.random() * ((lastCard || 7) - 1)) + 1
            : Math.floor(Math.random() * (13 - (lastCard || 7))) + (lastCard || 7) + 1);
      
      // Clamp card between 1 and 13
      const card = Math.max(1, Math.min(13, nextCard));
      
      const payout = won ? bet * 2 : 0;
      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "HiLo win" });

      res.json({ won, payout, balance: user?.balance ?? 0, card });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === DICE GAME ===
  app.post("/api/games/dice/roll", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const { bet, choice } = z.object({ 
        bet: z.number().min(100),
        choice: z.enum(["low", "high"]) // low: 1-3, high: 4-6
      }).parse(req.body);

      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("dice");
      const winChance = settings?.winChance ?? 0.48;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Dice roll" });

      const won = Math.random() < winChance;
      const roll = won 
        ? (choice === "low" ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 3) + 4)
        : (choice === "low" ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1);
      
      const payout = won ? bet * 2 : 0;
      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Dice win" });

      res.json({ won, payout, balance: user?.balance ?? 0, roll });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.games.settings.update.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    
    try {
      const { gameType, winChance } = api.games.settings.update.input.parse(req.body);
      const settings = await storage.updateGameSettings(gameType, winChance / 100, req.user.id);
      res.json(settings);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === VOUCHERS ===
  app.post(api.vouchers.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (req.user.role === 'user') return res.status(403).send("Forbidden");

    try {
      const input = api.vouchers.create.input.parse(req.body);
      const code = randomBytes(4).toString('hex').toUpperCase();
      const voucher = await storage.createVoucher({
        ...input,
        code,
        createdBy: req.user.id,
      });
      res.status(201).json(voucher);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.post(api.vouchers.redeem.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const input = api.vouchers.redeem.input.parse(req.body);
      const voucher = await storage.getVoucherByCode(input.code);

      if (!voucher || voucher.isRedeemed) return res.status(400).json({ message: "Invalid or already redeemed voucher" });

      await storage.redeemVoucher(voucher.id, req.user.id);
      const user = await storage.updateUserBalance(req.user.id, voucher.amount);
      await storage.createTransaction({
        userId: req.user.id,
        amount: voucher.amount,
        type: "voucher_redemption",
        description: `Redeemed voucher ${voucher.code}`,
      });

      res.json({ balance: user.balance, message: "Voucher redeemed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.vouchers.list.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === 'user') return res.status(403).send("Forbidden");
    const vouchers = await storage.getAllVouchers();
    res.json(vouchers);
  });

  // === GAMES ===
  app.post(api.games.slots.spin.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const { bet } = api.games.slots.spin.input.parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("slots");
      const winChance = settings?.winChance ?? 0.3;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Slots spin" });

      const won = Math.random() < winChance;
      const symbols = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "7️⃣"];
      
      let reels: string[];
      let payout = 0;

      if (won) {
        const winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        reels = [winSymbol, winSymbol, winSymbol];
        payout = bet * 10;
      } else {
        reels = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
        ];
        // Ensure not all 3 match
        while(reels[0] === reels[1] && reels[1] === reels[2]) {
           reels[2] = symbols[(symbols.indexOf(reels[2]) + 1) % symbols.length];
        }
      }

      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Slots win" });

      res.json({ won, payout, balance: user?.balance ?? 0, reels });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.games.roulette.spin.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const { bet, type, value } = api.games.roulette.spin.input.parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("roulette");
      const houseEdgeChance = settings?.winChance ?? 0.45; // Actually this is the player's general win chance

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Roulette spin" });

      // Determine if player SHOULD win based on admin settings
      const shouldWin = Math.random() < houseEdgeChance;
      
      let number: number;
      const colors: Record<number, string> = { 0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red', 31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red' };

      // Simplified logic: pick a number that satisfies shouldWin
      if (shouldWin) {
        // Find a winning number
        const winningNumbers = Object.keys(colors).map(Number).filter(n => {
          if (type === 'number') return n === Number(value);
          if (type === 'color') return colors[n] === value;
          if (type === 'parity') {
             if (n === 0) return false;
             return value === (n % 2 === 0 ? 'even' : 'odd');
          }
          return false;
        });
        number = winningNumbers.length > 0 ? winningNumbers[Math.floor(Math.random() * winningNumbers.length)] : Math.floor(Math.random() * 37);
      } else {
        // Find a losing number
        const losingNumbers = Object.keys(colors).map(Number).filter(n => {
          if (type === 'number') return n !== Number(value);
          if (type === 'color') return colors[n] !== value;
          if (type === 'parity') {
             if (n === 0) return true; // House win
             return value !== (n % 2 === 0 ? 'even' : 'odd');
          }
          return true;
        });
        number = losingNumbers[Math.floor(Math.random() * losingNumbers.length)];
      }

      const color = colors[number];
      let won = false;
      let payout = 0;

      if (type === 'number' && number === Number(value)) { won = true; payout = bet * 35; }
      else if (type === 'color' && color === value) { won = true; payout = bet * 2; }
      else if (type === 'parity' && number !== 0) {
        const isEven = number % 2 === 0;
        if ((value === 'even' && isEven) || (value === 'odd' && !isEven)) { won = true; payout = bet * 2; }
      }

      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Roulette win" });

      res.json({ won, payout, balance: user?.balance ?? 0, result: { number, color } });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === ADMIN USERS ===
  app.get(api.admin.users.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'manager')) return res.status(403).send("Forbidden");
    const usersList = await storage.getAllUsers();
    res.json(usersList);
  });

  app.post("/api/admin/users/:id/approve", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'manager')) return res.status(403).send("Forbidden");
    const userId = parseInt(req.params.id);
    const updatedUser = await storage.approveUser(userId);
    res.json(updatedUser);
  });

  // === WITHDRAWAL REQUESTS ===
  app.post("/api/withdraw/request", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const { amount } = z.object({ amount: z.number().min(500) }).parse(req.body);
      if (req.user.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

      // Deduct immediately and create request
      await storage.updateUserBalance(req.user.id, -amount);
      const withdrawalRequest = await storage.createWithdrawalRequest({
        userId: req.user.id,
        amount,
      });

      await storage.createTransaction({
        userId: req.user.id,
        amount: -amount,
        type: "withdrawal",
        description: `Withdrawal request pending: ${withdrawalRequest.id}`,
      });

      res.status(201).json(withdrawalRequest);
    } catch (err) {
      res.status(400).json({ message: "Invalid amount or insufficient funds" });
    }
  });

  app.get("/api/withdraw/requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    if (req.user.role === 'user') {
      const requests = await storage.getUserWithdrawalRequests(req.user.id);
      return res.json(requests);
    } else {
      const requests = await storage.getPendingWithdrawalRequests();
      return res.json(requests);
    }
  });

  app.post("/api/admin/withdraw/requests/:id/process", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === 'user') return res.status(403).send("Forbidden");
    
    const { id } = req.params;
    const { status } = z.object({ status: z.enum(["approved", "rejected"]) }).parse(req.body);
    
    const request = await storage.getWithdrawalRequest(parseInt(id));
    if (!request || request.status !== 'pending') return res.status(404).json({ message: "Request not found or already processed" });

    if (status === 'rejected') {
      // Refund balance
      await storage.updateUserBalance(request.userId, request.amount);
      await storage.createTransaction({
        userId: request.userId,
        amount: request.amount,
        type: "deposit",
        description: `Withdrawal request rejected: ${request.id}`,
      });
    }

    const updated = await storage.updateWithdrawalRequest(request.id, status, req.user.id);
    res.json(updated);
  });

  app.post(api.admin.withdraw.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    
    try {
      const { userId, amount } = api.admin.withdraw.input.parse(req.body);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.balance < amount) return res.status(400).json({ message: "Insufficient user balance" });

      const updatedUser = await storage.updateUserBalance(userId, -amount);
      await storage.createTransaction({
        userId,
        amount: -amount,
        type: "withdrawal",
        description: `Admin withdrawal: ${req.user.username}`,
      });

      res.json({ balance: updatedUser.balance, message: "Withdrawal successful" });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  return httpServer;
}
